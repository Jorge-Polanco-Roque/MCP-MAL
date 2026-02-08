export interface IStorage {
  read(path: string): Promise<string>;
  write(path: string, content: string, contentType?: string): Promise<void>;
  delete(path: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): Promise<string>;
}
