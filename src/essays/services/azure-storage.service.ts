import { Injectable } from '@nestjs/common';
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  blobName: string;
  url: string;
  sasUrl: string;
}

@Injectable()
export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'AZURE_CONNECTION_STRING',
    );
    this.containerName = this.configService.get<string>(
      'AZURE_CONTAINER',
      'essays',
    );

    if (!connectionString) {
      throw new Error('Azure Storage connection string not configured');
    }

    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
  }

  async uploadFile(
    filePath: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadedFile> {
    const blobName = `${uuidv4()}_${fileName}`;
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // 파일 업로드
    const fileBuffer = fs.readFileSync(filePath);
    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    // SAS URL 생성 (24시간 유효)
    const sasUrl = this.generateSasUrl(blobName, 24);

    return {
      blobName,
      url: blockBlobClient.url,
      sasUrl,
    };
  }

  async uploadVideo(filePath: string): Promise<UploadedFile> {
    return this.uploadFile(filePath, 'video.mp4', 'video/mp4');
  }

  async uploadAudio(filePath: string): Promise<UploadedFile> {
    return this.uploadFile(filePath, 'audio.mp3', 'audio/mpeg');
  }

  private generateSasUrl(blobName: string, validityHours: number): string {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + validityHours);

    const sasOptions = {
      containerName: this.containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // read-only
      expiresOn,
    };

    const sasQueryParameters = generateBlobSASQueryParameters(
      sasOptions,
      this.blobServiceClient.credential as StorageSharedKeyCredential,
    );

    return `${blockBlobClient.url}?${sasQueryParameters.toString()}`;
  }

  async deleteFile(blobName: string): Promise<void> {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.delete();
    } catch (error) {
      console.warn(
        `Failed to delete blob ${blobName}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
