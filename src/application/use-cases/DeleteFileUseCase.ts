import { assertValidUserKey, userPrefix } from '../../domain/StoredFile.js';
import { FileStoragePort } from '../ports/FileStoragePort.js';
import { AuthUser } from '../ports/TokenVerifierPort.js';
import { assertCanAccessUserFiles } from './accessGuard.js';

export class DeleteFileUseCase {
  constructor(private readonly storage: FileStoragePort) {}

  async execute(authUser: AuthUser, userId: string, key: string): Promise<void> {
    assertCanAccessUserFiles(authUser, userId);
    assertValidUserKey(userId, key);
    await this.storage.delete(key);
  }

  async deleteAllForUser(authUser: AuthUser, userId: string): Promise<number> {
    assertCanAccessUserFiles(authUser, userId);
    return this.storage.deleteByPrefix(userPrefix(userId));
  }
}
