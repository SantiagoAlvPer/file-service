import 'dotenv/config';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { DeleteFileUseCase } from './application/use-cases/DeleteFileUseCase.js';
import { GetDownloadUrlUseCase } from './application/use-cases/GetDownloadUrlUseCase.js';
import { ListFilesUseCase } from './application/use-cases/ListFilesUseCase.js';
import { UploadFileUseCase } from './application/use-cases/UploadFileUseCase.js';
import { DomainError } from './domain/StoredFile.js';
import { createFileRouter } from './infrastructure/http/controllers/FileController.js';
import { createAuthMiddleware } from './infrastructure/http/middleware/authMiddleware.js';
import { JwtTokenVerifierAdapter } from './infrastructure/security/JwtTokenVerifierAdapter.js';
import { BackblazeS3StorageAdapter } from './infrastructure/storage/BackblazeS3StorageAdapter.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(process.env.PORT ?? 3001);
const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES ?? 5 * 1024 * 1024);
const presignedUrlTtlSeconds = Number(process.env.PRESIGNED_URL_TTL_SECONDS ?? 300);
const jwtIsBase64 = process.env.JWT_SECRET_IS_BASE64 !== 'false';

const storageAdapter = new BackblazeS3StorageAdapter({
  endpoint: requireEnv('B2_ENDPOINT'),
  region: requireEnv('B2_REGION'),
  bucket: requireEnv('B2_BUCKET'),
  keyId: requireEnv('B2_KEY_ID'),
  appKey: requireEnv('B2_APP_KEY'),
});

const tokenVerifier = new JwtTokenVerifierAdapter(
  requireEnv('JWT_SECRET'),
  jwtIsBase64
);

const uploadFileUseCase = new UploadFileUseCase(storageAdapter, maxFileSizeBytes);
const listFilesUseCase = new ListFilesUseCase(storageAdapter);
const getDownloadUrlUseCase = new GetDownloadUrlUseCase(
  storageAdapter,
  presignedUrlTtlSeconds
);
const deleteFileUseCase = new DeleteFileUseCase(storageAdapter);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'file-service' });
});

app.use(
  createAuthMiddleware(tokenVerifier),
  createFileRouter({
    uploadFileUseCase,
    listFilesUseCase,
    getDownloadUrlUseCase,
    deleteFileUseCase,
    maxFileSizeBytes,
  })
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error('[file-service] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`[file-service] listening on port ${port}`);
});
