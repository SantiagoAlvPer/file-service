import { NextFunction, Request, Response } from 'express';
import {
  AuthUser,
  TokenVerifierPort,
} from '../../../application/ports/TokenVerifierPort.js';
import { UnauthorizedError } from '../../../domain/StoredFile.js';

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

export function createAuthMiddleware(verifier: TokenVerifierPort) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid Authorization header');
      }
      const token = authHeader.slice('Bearer '.length).trim();
      req.authUser = verifier.verify(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
