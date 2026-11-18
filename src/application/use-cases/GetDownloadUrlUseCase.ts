import { assertValidUserKey } from '../../domain/StoredFile.js';
import { FileStoragePort } from '../ports/FileStoragePort.js';
import { AuthUser } from '../ports/TokenVerifierPort.js';
import { assertCanAccessUserFiles } from './accessGuard.js';

export interface DownloadUrlResult {
  url: string;
  expiresIn: number;
}

export class GetDownloadUrlUseCase {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly expiresInSeconds: number
  ) {}

  async execute(
    authUser: AuthUser,
    userId: string,
    key: string
  ): Promise<DownloadUrlResult> {
    assertCanAccessUserFiles(authUser, userId);
    assertValidUserKey(userId, key);

    const url = await this.storage.getDownloadUrl(key, this.expiresInSeconds);
    return { url, expiresIn: this.expiresInSeconds };
  }
}
