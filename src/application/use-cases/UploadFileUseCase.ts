import { randomUUID } from 'node:crypto';
import {
  ALLOWED_MIME_TYPES,
  StoredFile,
  ValidationError,
  sanitizeFileName,
  userPrefix,
} from '../../domain/StoredFile.js';
import { FileStoragePort } from '../ports/FileStoragePort.js';
import { AuthUser } from '../ports/TokenVerifierPort.js';
import { assertCanAccessUserFiles } from './accessGuard.js';

export interface UploadFileInput {
  authUser: AuthUser;
  userId: string;
  originalName: string;
  contentType: string;
  size: number;
  buffer: Buffer;
}

export class UploadFileUseCase {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly maxFileSizeBytes: number
  ) {}

  async execute(input: UploadFileInput): Promise<StoredFile> {
    assertCanAccessUserFiles(input.authUser, input.userId);

    if (!input.buffer || input.size <= 0) {
      throw new ValidationError('File is empty');
    }
    if (input.size > this.maxFileSizeBytes) {
      throw new ValidationError(
        `File exceeds maximum allowed size of ${this.maxFileSizeBytes} bytes`
      );
    }
    if (!ALLOWED_MIME_TYPES.has(input.contentType)) {
      throw new ValidationError(
        'Unsupported file type. Allowed types: application/pdf, image/png, image/jpeg'
      );
    }

    const safeName = sanitizeFileName(input.originalName);
    const key = `${userPrefix(input.userId)}${randomUUID()}-${safeName}`;

    return this.storage.upload({
      key,
      body: input.buffer,
      contentType: input.contentType,
      size: input.size,
      ownerId: input.userId,
    });
  }
}
