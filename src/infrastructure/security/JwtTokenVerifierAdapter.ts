import jwt, { JwtPayload } from 'jsonwebtoken';
import {
  AuthUser,
  TokenVerifierPort,
} from '../../application/ports/TokenVerifierPort.js';
import { UnauthorizedError } from '../../domain/StoredFile.js';

export class JwtTokenVerifierAdapter implements TokenVerifierPort {
  private readonly secretKey: string | Buffer;

  constructor(secret: string, isBase64 = true) {
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    this.secretKey = isBase64 ? Buffer.from(secret, 'base64') : secret;
  }

  verify(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, this.secretKey) as JwtPayload | string;
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Invalid token payload');
      }

      const userId = String(decoded.userId ?? decoded.sub ?? '');
      if (!userId) {
        throw new UnauthorizedError('Token missing user identifier');
      }

      const rawRole = decoded.role ?? decoded.roles ?? 'MEMBER';
      const role = Array.isArray(rawRole)
        ? String(rawRole[0] ?? 'MEMBER')
        : String(rawRole);

      return {
        userId,
        role: role.replace(/^ROLE_/, ''),
        email: typeof decoded.email === 'string' ? decoded.email : undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
