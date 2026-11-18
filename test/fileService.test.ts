import assert from 'node:assert/strict';
import test from 'node:test';
import { FileStoragePort, UploadObjectInput } from '../src/application/ports/FileStoragePort.js';
import { DeleteFileUseCase } from '../src/application/use-cases/DeleteFileUseCase.js';
import { GetDownloadUrlUseCase } from '../src/application/use-cases/GetDownloadUrlUseCase.js';
import { UploadFileUseCase } from '../src/application/use-cases/UploadFileUseCase.js';
import {
  ForbiddenError,
  StoredFile,
  ValidationError,
} from '../src/domain/StoredFile.js';

class InMemoryStorage implements FileStoragePort {
  public files = new Map<string, StoredFile>();

  async upload(input: UploadObjectInput): Promise<StoredFile> {
    const file: StoredFile = {
      key: input.key,
      ownerId: input.ownerId,
      contentType: input.contentType,
      size: input.size,
    };
    this.files.set(input.key, file);
    return file;
  }

  async listByPrefix(prefix: string): Promise<StoredFile[]> {
    return [...this.files.values()].filter((f) => f.key.startsWith(prefix));
  }

  async getDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return `https://signed.example/${key}?ttl=${expiresInSeconds}`;
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        this.files.delete(key);
        count++;
      }
    }
    return count;
  }
}

test('UploadFileUseCase stores file under usuarios/{userId}/ prefix', async () => {
  const storage = new InMemoryStorage();
  const useCase = new UploadFileUseCase(storage, 5 * 1024 * 1024);

  const stored = await useCase.execute({
    authUser: { userId: 'u-1', role: 'MEMBER' },
    userId: 'u-1',
    originalName: 'certificado prueba.pdf',
    contentType: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('pdf-data'),
  });

  assert.ok(stored.key.startsWith('usuarios/u-1/'));
  assert.ok(stored.key.endsWith('certificado_prueba.pdf'));
});

test('UploadFileUseCase rejects another user without ADMIN role', async () => {
  const storage = new InMemoryStorage();
  const useCase = new UploadFileUseCase(storage, 5 * 1024 * 1024);

  await assert.rejects(
    () =>
      useCase.execute({
        authUser: { userId: 'u-1', role: 'MEMBER' },
        userId: 'u-2',
        originalName: 'doc.pdf',
        contentType: 'application/pdf',
        size: 100,
        buffer: Buffer.from('abc'),
      }),
    ForbiddenError
  );
});

test('GetDownloadUrlUseCase blocks path traversal keys', async () => {
  const storage = new InMemoryStorage();
  const useCase = new GetDownloadUrlUseCase(storage, 300);

  await assert.rejects(
    () =>
      useCase.execute(
        { userId: 'u-1', role: 'MEMBER' },
        'u-1',
        'usuarios/u-1/../u-2/secret.pdf'
      ),
    ValidationError
  );
});

test('DeleteFileUseCase deletes all files for user by prefix', async () => {
  const storage = new InMemoryStorage();
  const upload = new UploadFileUseCase(storage, 5 * 1024 * 1024);
  const del = new DeleteFileUseCase(storage);

  await upload.execute({
    authUser: { userId: 'u-1', role: 'MEMBER' },
    userId: 'u-1',
    originalName: 'a.png',
    contentType: 'image/png',
    size: 10,
    buffer: Buffer.from('png'),
  });

  const deleted = await del.deleteAllForUser({ userId: 'u-1', role: 'ADMIN' }, 'u-1');
  assert.equal(deleted, 1);
  assert.equal(storage.files.size, 0);
});
