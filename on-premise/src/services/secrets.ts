export interface ISecrets {
  get(key: string): Promise<string>;
  has(key: string): Promise<boolean>;
}
