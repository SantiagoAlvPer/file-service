import { StoredFile, userPrefix } from '../../domain/StoredFile.js';
import { FileStoragePort } from '../ports/FileStoragePort.js';
import { AuthUser } from '../ports/TokenVerifierPort.js';
import { assertCanAccessUserFiles } from './accessGuard.js';

export class ListFilesUseCase {
  constructor(private readonly storage: FileStoragePort) {}

  async execute(authUser: AuthUser, userId: string): Promise<StoredFile[]> {
    assertCanAccessUserFiles(authUser, userId);
    return this.storage.listByPrefix(userPrefix(userId), userId);
  }
}
