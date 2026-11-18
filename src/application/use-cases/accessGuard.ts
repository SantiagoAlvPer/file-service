import { AuthUser } from '../ports/TokenVerifierPort.js';
import { ForbiddenError, ValidationError } from '../../domain/StoredFile.js';

export function assertCanAccessUserFiles(authUser: AuthUser, targetUserId: string): void {
  if (!targetUserId || targetUserId.includes('..') || targetUserId.includes('/')) {
    throw new ValidationError('Invalid userId');
  }
  if (authUser.role === 'ADMIN') {
    return;
  }
  if (authUser.userId !== targetUserId) {
    throw new ForbiddenError('You can only access your own files');
  }
}
