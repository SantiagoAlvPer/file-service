import { StoredFile } from '../../domain/StoredFile.js';

export interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  size: number;
  ownerId: string;
}

export interface FileStoragePort {
  upload(input: UploadObjectInput): Promise<StoredFile>;
  listByPrefix(prefix: string, ownerId: string): Promise<StoredFile[]>;
  getDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<number>;
}
