import { Injectable, Logger } from '@nestjs/common';
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  blobName: string;
  url: string;
  sasUrl: string;
}

@Injectable()
export class AzureStorageService {
  private readonly logger = new Logger(AzureStorageService.name);
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
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
    return this.uploadFile(filePath, 'audio.m4a', 'audio/mp4');
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

  /**
   * 캐시를 사용하여 SAS URL 생성 (중복 생성 방지)
   */
  async getSasUrlWithCache(
    blobName: string,
    validityHours: number = 24,
  ): Promise<string> {
    const cacheKey = this.cacheService.getFileUrlKey(blobName);

    // 캐시에서 조회
    const cachedUrl = await this.cacheService.get<string>(cacheKey);

    if (cachedUrl) {
      return cachedUrl;
    }

    // SAS URL 생성
    const sasUrl = this.generateSasUrl(blobName, validityHours);

    // 캐시에 저장 (SAS URL 만료 시간보다 짧게 설정 - 20시간)
    const cacheValiditySeconds = Math.min(validityHours - 4, 20) * 60 * 60;
    await this.cacheService.set(cacheKey, sasUrl, cacheValiditySeconds);

    return sasUrl;
  }

  async deleteFile(blobName: string): Promise<void> {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.delete();
    } catch (error) {
      this.logger.warn(
        `Failed to delete blob ${blobName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
