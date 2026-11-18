import { NextFunction, Response, Router } from 'express';
import multer from 'multer';
import { DeleteFileUseCase } from '../../../application/use-cases/DeleteFileUseCase.js';
import { GetDownloadUrlUseCase } from '../../../application/use-cases/GetDownloadUrlUseCase.js';
import { ListFilesUseCase } from '../../../application/use-cases/ListFilesUseCase.js';
import { UploadFileUseCase } from '../../../application/use-cases/UploadFileUseCase.js';
import { UnauthorizedError, ValidationError } from '../../../domain/StoredFile.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export interface FileControllerDeps {
  uploadFileUseCase: UploadFileUseCase;
  listFilesUseCase: ListFilesUseCase;
  getDownloadUrlUseCase: GetDownloadUrlUseCase;
  deleteFileUseCase: DeleteFileUseCase;
  maxFileSizeBytes: number;
}

function getAuthUser(req: AuthenticatedRequest) {
  if (!req.authUser) {
    throw new UnauthorizedError();
  }
  return req.authUser;
}

function getUserIdParam(req: AuthenticatedRequest): string {
  const raw = req.params.userId;
  return Array.isArray(raw) ? raw[0] ?? '' : String(raw ?? '');
}

export function createFileRouter(deps: FileControllerDeps): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: deps.maxFileSizeBytes },
  });

  router.post(
    '/users/:userId/files',
    upload.single('file'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authUser = getAuthUser(req);
        if (!req.file) {
          throw new ValidationError('Multipart field "file" is required');
        }
        const stored = await deps.uploadFileUseCase.execute({
          authUser,
          userId: getUserIdParam(req),
          originalName: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
        });
        res.status(201).json({
          key: stored.key,
          size: stored.size,
          contentType: stored.contentType,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/users/:userId/files',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authUser = getAuthUser(req);
        const files = await deps.listFilesUseCase.execute(authUser, getUserIdParam(req));
        res.json({ files });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/users/:userId/files/download',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authUser = getAuthUser(req);
        const key = String(req.query.key ?? '');
        const result = await deps.getDownloadUrlUseCase.execute(
          authUser,
          getUserIdParam(req),
          key
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    '/users/:userId/files',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authUser = getAuthUser(req);
        if (req.query.all === 'true') {
          const deletedCount = await deps.deleteFileUseCase.deleteAllForUser(
            authUser,
            getUserIdParam(req)
          );
          res.json({ deletedCount });
          return;
        }
        const key = String(req.query.key ?? '');
        await deps.deleteFileUseCase.execute(authUser, getUserIdParam(req), key);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
