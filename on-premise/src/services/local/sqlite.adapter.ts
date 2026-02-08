import Database from "better-sqlite3";
import type { IDatabase } from "../database.js";
import type { PaginatedResult, QueryOptions } from "../../types.js";

export class SQLiteAdapter implements IDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const stmt = this.db.prepare(`SELECT * FROM "${collection}" WHERE id = ?`);
    const row = stmt.get(id);
    return row ? this.deserializeRow<T>(row) : null;
  }

  async list<T>(collection: string, options?: QueryOptions): Promise<PaginatedResult<T>> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;

    let whereClause = "1=1";
    const params: unknown[] = [];

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (typeof value === "string" && value.includes(",")) {
          whereClause += ` AND "${key}" LIKE ?`;
          params.push(`%${value}%`);
        } else {
          whereClause += ` AND "${key}" = ?`;
          params.push(value);
        }
      }
    }

    const orderBy = options?.order_by ?? "updated_at";
    const orderDir = options?.order_dir ?? "desc";

    const countStmt = this.db.prepare(
      `SELECT COUNT(*) as total FROM "${collection}" WHERE ${whereClause}`
    );
    const countRow = countStmt.get(...params) as { total: number };
    const total = countRow.total;

    const dataStmt = this.db.prepare(
      `SELECT * FROM "${collection}" WHERE ${whereClause} ORDER BY "${orderBy}" ${orderDir} LIMIT ? OFFSET ?`
    );
    const rows = dataStmt.all(...params, limit, offset) as Record<string, unknown>[];

    return {
      items: rows.map((r) => this.deserializeRow<T>(r)),
      total,
      has_more: total > offset + rows.length,
      next_offset: total > offset + rows.length ? offset + rows.length : undefined,
    };
  }

  async create<T>(collection: string, id: string, data: T): Promise<T> {
    const obj = data as Record<string, unknown>;
    if (id) {
      obj.id = id;
    }
    const now = new Date().toISOString();
    obj.created_at = obj.created_at ?? now;
    if (!("updated_at" in obj) || obj.updated_at === undefined) {
      obj.updated_at = now;
    }

    const keys = Object.keys(obj).filter((k) => k !== "id" || id);
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map((k) => this.serializeValue(obj[k]));

    const stmt = this.db.prepare(
      `INSERT INTO "${collection}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${placeholders})`
    );
    const result = stmt.run(...values);

    if (!id) {
      obj.id = result.lastInsertRowid;
    }

    return this.deserializeRow<T>(obj);
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    const obj = data as Record<string, unknown>;
    obj.updated_at = new Date().toISOString();

    const keys = Object.keys(obj);
    const sets = keys.map((k) => `"${k}" = ?`).join(", ");
    const values = keys.map((k) => this.serializeValue(obj[k]));

    const stmt = this.db.prepare(`UPDATE "${collection}" SET ${sets} WHERE id = ?`);
    stmt.run(...values, id);

    const result = await this.get<T>(collection, id);
    if (!result) throw new Error(`Record ${id} not found after update`);
    return result;
  }

  async delete(collection: string, id: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM "${collection}" WHERE id = ?`);
    stmt.run(id);
  }

  async search<T>(collection: string, query: string, options?: QueryOptions): Promise<PaginatedResult<T>> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;

    const ftsStmt = this.db.prepare(
      `SELECT id FROM catalog_fts WHERE catalog_fts MATCH ? AND collection = ? LIMIT ? OFFSET ?`
    );
    const ftsRows = ftsStmt.all(query, collection, limit, offset) as Array<{ id: string }>;

    const ids = ftsRows.map((r) => r.id);
    if (ids.length === 0) {
      return { items: [], total: 0, has_more: false };
    }

    const placeholders = ids.map(() => "?").join(",");
    const dataStmt = this.db.prepare(
      `SELECT * FROM "${collection}" WHERE id IN (${placeholders})`
    );
    const rows = dataStmt.all(...ids) as Record<string, unknown>[];

    return {
      items: rows.map((r) => this.deserializeRow<T>(r)),
      total: rows.length,
      has_more: false,
    };
  }

  async ping(): Promise<boolean> {
    try {
      this.db.prepare("SELECT 1").get();
      return true;
    } catch {
      return false;
    }
  }

  syncFtsIndex(collection: string, id: string, name: string, description: string, tags: string[]): void {
    const deleteStmt = this.db.prepare(
      `DELETE FROM catalog_fts WHERE id = ? AND collection = ?`
    );
    deleteStmt.run(id, collection);

    const insertStmt = this.db.prepare(
      `INSERT INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`
    );
    insertStmt.run(id, name, description, tags.join(" "), collection);
  }

  private deserializeRow<T>(row: unknown): T {
    const obj = { ...(row as Record<string, unknown>) };
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" && (value.startsWith("[") || value.startsWith("{"))) {
        try {
          obj[key] = JSON.parse(value);
        } catch {
          // keep as string
        }
      }
    }
    return obj as T;
  }

  private serializeValue(value: unknown): unknown {
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }
    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      return JSON.stringify(value);
    }
    return value;
  }
}
