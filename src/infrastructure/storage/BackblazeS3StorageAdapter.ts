import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  FileStoragePort,
  UploadObjectInput,
} from '../../application/ports/FileStoragePort.js';
import { NotFoundError, StoredFile } from '../../domain/StoredFile.js';

export interface BackblazeS3Config {
  endpoint: string;
  region: string;
  bucket: string;
  keyId: string;
  appKey: string;
}

function normalizeEndpoint(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  return `https://${endpoint}`;
}

export class BackblazeS3StorageAdapter implements FileStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: BackblazeS3Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: normalizeEndpoint(config.endpoint),
      region: config.region,
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.appKey,
      },
      forcePathStyle: true,
    });
  }

  async upload(input: UploadObjectInput): Promise<StoredFile> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.size,
      })
    );

    return {
      key: input.key,
      ownerId: input.ownerId,
      contentType: input.contentType,
      size: input.size,
    };
  }

  async listByPrefix(prefix: string, ownerId: string): Promise<StoredFile[]> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    );

    return (response.Contents ?? []).map((item) => ({
      key: item.Key ?? '',
      ownerId,
      contentType: 'application/octet-stream',
      size: item.Size ?? 0,
      lastModified: item.LastModified,
    }));
  }

  async getDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch {
      throw new NotFoundError('File not found in storage');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const list = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    );

    const objects = (list.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key))
      .map((Key) => ({ Key }));

    if (objects.length === 0) {
      return 0;
    }

    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: objects, Quiet: true },
      })
    );

    return objects.length;
  }
}
