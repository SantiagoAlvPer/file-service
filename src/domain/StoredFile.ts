export interface StoredFile {
  key: string;
  ownerId: string;
  contentType: string;
  size: number;
  lastModified?: Date;
}

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'File not found') {
    super(message, 404);
  }
}

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
]);

export function userPrefix(userId: string): string {
  return `usuarios/${userId}/`;
}

/**
 * Ensures the requested storage key belongs to the target user and contains no path traversal.
 */
export function assertValidUserKey(userId: string, key: string): void {
  if (!key || typeof key !== 'string') {
    throw new ValidationError('File key is required');
  }
  if (key.includes('..') || key.includes('\\')) {
    throw new ValidationError('Invalid file key');
  }
  const prefix = userPrefix(userId);
  if (!key.startsWith(prefix) || key.length <= prefix.length) {
    throw new ForbiddenError('Access denied to the requested file key');
  }
}

export function sanitizeFileName(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'file';
}
