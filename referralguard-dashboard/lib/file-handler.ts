import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config';

export interface FileHandlerInterface {
  isS3Path(path: string): boolean;
  readJson(path: string): Promise<any | null>;
  writeJson(data: any, path: string): Promise<boolean>;
  fileExists(path: string): Promise<boolean>;
}

export class FileHandler implements FileHandlerInterface {
  private s3Client: S3Client | null = null;

  constructor() {
    if (config.isProduction && config.awsCredentials.accessKeyId) {
      try {
        this.s3Client = new S3Client({
          region: config.awsCredentials.region,
          credentials: {
            accessKeyId: config.awsCredentials.accessKeyId,
            secretAccessKey: config.awsCredentials.secretAccessKey!
          }
        });
      } catch (error) {
        console.warn("Warning: AWS credentials not found, falling back to local storage");
        this.s3Client = null;
      }
    }
  }

  isS3Path(path: string): boolean {
    return path.startsWith('s3://');
  }

  async readJson(path: string): Promise<any | null> {
    try {
      if (this.isS3Path(path)) {
        return await this.readJsonFromS3(path);
      } else {
        return await this.readJsonFromLocal(path);
      }
    } catch (error) {
      console.error(`Error reading JSON from ${path}:`, error);
      return null;
    }
  }

  async writeJson(data: any, path: string): Promise<boolean> {
    try {
      if (this.isS3Path(path)) {
        return await this.writeJsonToS3(data, path);
      } else {
        return await this.writeJsonToLocal(data, path);
      }
    } catch (error) {
      console.error(`Error writing JSON to ${path}:`, error);
      return false;
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      if (this.isS3Path(path)) {
        return await this.s3FileExists(path);
      } else {
        // For local files, we'll check if the file exists in the public directory
        // This is a simplified approach for Next.js
        return true; // We'll handle the actual file reading in readJsonFromLocal
      }
    } catch (error) {
      console.error(`Error checking file existence for ${path}:`, error);
      return false;
    }
  }

  private async readJsonFromLocal(path: string): Promise<any> {
    // For Next.js, we'll read from the public directory
    const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    return await response.json();
  }

  private async writeJsonToLocal(data: any, path: string): Promise<boolean> {
    // For Next.js, we'll write to the public directory via API
    const response = await fetch('/api/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, data }),
    });
    return response.ok;
  }

  private async readJsonFromS3(s3Path: string): Promise<any> {
    if (!this.s3Client) {
      throw new Error("S3 client not initialized");
    }

    const { bucket, key } = this.parseS3Path(s3Path);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error("Empty response body from S3");
    }

    const text = await response.Body.transformToString();
    return JSON.parse(text);
  }

  private async writeJsonToS3(data: any, s3Path: string): Promise<boolean> {
    if (!this.s3Client) {
      throw new Error("S3 client not initialized");
    }

    const { bucket, key } = this.parseS3Path(s3Path);
    const jsonData = JSON.stringify(data, null, 2);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: jsonData,
      ContentType: 'application/json'
    });

    await this.s3Client.send(command);
    return true;
  }

  private async s3FileExists(s3Path: string): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    const { bucket, key } = this.parseS3Path(s3Path);
    try {
      const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  private parseS3Path(s3Path: string): { bucket: string; key: string } {
    if (!s3Path.startsWith('s3://')) {
      throw new Error(`Invalid S3 path: ${s3Path}`);
    }

    const pathParts = s3Path.slice(5).split('/', 1);
    if (pathParts.length !== 2) {
      throw new Error(`Invalid S3 path format: ${s3Path}`);
    }

    return { bucket: pathParts[0], key: pathParts[1] };
  }
}

export const fileHandler = new FileHandler(); 