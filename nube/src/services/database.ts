import type { PaginatedResult, QueryOptions } from "../types.js";

export interface IDatabase {
  get<T>(collection: string, id: string): Promise<T | null>;
  list<T>(collection: string, options?: QueryOptions): Promise<PaginatedResult<T>>;
  create<T>(collection: string, id: string, data: T): Promise<T>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  delete(collection: string, id: string): Promise<void>;
  search<T>(collection: string, query: string, options?: QueryOptions): Promise<PaginatedResult<T>>;
  ping(): Promise<boolean>;
}
