import { Firestore } from "@google-cloud/firestore";
import type { IDatabase } from "../database.js";
import type { PaginatedResult, QueryOptions } from "../../types.js";

export class FirestoreAdapter implements IDatabase {
  private firestore: Firestore;

  constructor(projectId: string, databaseId: string = "mal-catalog") {
    this.firestore = new Firestore({
      projectId,
      databaseId,
    });
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const doc = await this.firestore.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as T;
  }

  async list<T>(collection: string, options?: QueryOptions): Promise<PaginatedResult<T>> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;

    let baseQuery: FirebaseFirestore.Query = this.firestore.collection(collection);

    // Apply filters
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (typeof value === "string" && value.includes(",")) {
          // Tag search: array-contains-any
          const tags = value.split(",").map((t) => t.trim());
          baseQuery = baseQuery.where(key, "array-contains-any", tags);
        } else {
          baseQuery = baseQuery.where(key, "==", value);
        }
      }
    }

    // Order
    const orderBy = options?.order_by ?? "updated_at";
    const orderDir = options?.order_dir ?? "desc";
    baseQuery = baseQuery.orderBy(orderBy, orderDir);

    // Get total count using the filtered query (not unfiltered collection)
    const countSnapshot = await baseQuery.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    const snapshot = await baseQuery.offset(offset).limit(limit).get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];

    return {
      items,
      total,
      has_more: total > offset + items.length,
      next_offset: total > offset + items.length ? offset + items.length : undefined,
    };
  }

  async create<T>(collection: string, id: string, data: T): Promise<T> {
    const obj = data as Record<string, unknown>;
    const now = new Date().toISOString();
    obj.created_at = obj.created_at ?? now;
    obj.updated_at = obj.updated_at ?? now;

    // Generate search_tokens for FTS
    const searchTokens = this.generateSearchTokens(obj);
    obj.search_tokens = searchTokens;

    await this.firestore.collection(collection).doc(id).set(obj);
    return { id, ...obj } as T;
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    const obj = data as Record<string, unknown>;
    obj.updated_at = new Date().toISOString();

    // Regenerate search tokens if name/description/tags changed
    if (obj.name || obj.description || obj.tags) {
      const existing = await this.get<Record<string, unknown>>(collection, id);
      if (existing) {
        const merged = { ...existing, ...obj };
        obj.search_tokens = this.generateSearchTokens(merged);
      }
    }

    await this.firestore.collection(collection).doc(id).update(obj);

    const result = await this.get<T>(collection, id);
    if (!result) throw new Error(`Record ${id} not found after update`);
    return result;
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.firestore.collection(collection).doc(id).delete();
  }

  async search<T>(collection: string, query: string, options?: QueryOptions): Promise<PaginatedResult<T>> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;

    // Tokenize query for array-contains-any search
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .slice(0, 10); // Firestore limit

    if (tokens.length === 0) {
      return { items: [], total: 0, has_more: false };
    }

    const searchQuery = this.firestore
      .collection(collection)
      .where("search_tokens", "array-contains-any", tokens);

    // Get total count for the search query
    const countSnapshot = await searchQuery.count().get();
    const total = countSnapshot.data().count;

    const snapshot = await searchQuery
      .offset(offset)
      .limit(limit)
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];

    return {
      items,
      total,
      has_more: total > offset + items.length,
      next_offset: total > offset + items.length ? offset + items.length : undefined,
    };
  }

  async ping(): Promise<boolean> {
    try {
      await this.firestore.listCollections();
      return true;
    } catch {
      return false;
    }
  }

  private generateSearchTokens(obj: Record<string, unknown>): string[] {
    const parts: string[] = [];

    if (typeof obj.name === "string") parts.push(obj.name);
    if (typeof obj.description === "string") parts.push(obj.description);
    if (typeof obj.id === "string") parts.push(obj.id);
    if (Array.isArray(obj.tags)) parts.push(...obj.tags.map(String));

    const tokens = parts
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    return [...new Set(tokens)];
  }
}
