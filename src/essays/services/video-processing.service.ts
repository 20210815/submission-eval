import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessedVideo {
  videoPath: string; // 무음 비디오 파일 경로
  audioPath: string; // 오디오 파일 경로
}

@Injectable()
export class VideoProcessingService {
  private static readonly CROP_VIDEO_TIMEOUT_MS = 5 * 60 * 1000;
  private static readonly AUDIO_EXTRACTION_TIMEOUT_MS = 3 * 60 * 1000;
  private static readonly AUDIO_PROCESSING_TIMEOUT_MS = 3 * 60 * 1000;

  private readonly tempDir = path.join(process.cwd(), 'temp');

  constructor() {
    // temp 디렉토리 생성
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async processVideo(videoBuffer: Buffer): Promise<ProcessedVideo> {
    const fileId = uuidv4();
    const inputPath = path.join(this.tempDir, `${fileId}_input.mp4`);
    const croppedVideoPath = path.join(this.tempDir, `${fileId}_cropped.mp4`);
    const silentVideoPath = path.join(this.tempDir, `${fileId}_silent.mp4`);
    const audioPath = path.join(this.tempDir, `${fileId}_audio.m4a`);

    try {
      // 1. 버퍼를 임시 파일로 저장
      try {
        fs.writeFileSync(inputPath, videoBuffer);
      } catch (error) {
        if (error instanceof Error && error.message.includes('ENOSPC')) {
          throw new Error(
            '디스크 공간이 부족합니다. 잠시 후 다시 시도해주세요.',
          );
        }
        throw new Error(
          `임시 파일 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // 2. 우측 이미지 제거 (좌측 50% 영역만 크롭)
      await this.cropVideo(inputPath, croppedVideoPath);

      // 3. 영상에서 오디오 추출
      await this.extractAudio(croppedVideoPath, audioPath);

      // 4. 영상에서 오디오 제거 (무음 비디오 생성)
      await this.removeAudio(croppedVideoPath, silentVideoPath);

      // 5. 임시 파일들 정리
      this.cleanupFiles([inputPath, croppedVideoPath]);

      return {
        videoPath: silentVideoPath,
        audioPath: audioPath,
      };
    } catch (error) {
      // 에러 발생 시 모든 임시 파일 정리
      this.cleanupFiles([
        inputPath,
        croppedVideoPath,
        silentVideoPath,
        audioPath,
      ]);
      throw new Error(
        `Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async cropVideo(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('비디오 크롭 처리 시간이 초과되었습니다. (5분 제한)'));
      }, VideoProcessingService.CROP_VIDEO_TIMEOUT_MS); // 5분 타임아웃

      ffmpeg(inputPath)
        .videoFilters('crop=iw/2:ih:iw/2:0') // 좌측 50% 영역만 크롭
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`비디오 크롭 처리 실패: ${err.message}`));
        })
        .run();
    });
  }

  private async extractAudio(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('오디오 추출 처리 시간이 초과되었습니다. (3분 제한)'));
      }, VideoProcessingService.AUDIO_EXTRACTION_TIMEOUT_MS); // 3분 타임아웃

      ffmpeg(inputPath)
        .output(outputPath)
        .audioCodec('aac')
        .noVideo()
        .on('end', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`오디오 추출 실패: ${err.message}`));
        })
        .run();
    });
  }

  private async removeAudio(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('오디오 제거 처리 시간이 초과되었습니다. (3분 제한)'));
      }, VideoProcessingService.AUDIO_PROCESSING_TIMEOUT_MS); // 3분 타임아웃

      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('copy')
        .noAudio()
        .on('end', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`오디오 제거 실패: ${err.message}`));
        })
        .run();
    });
  }

  private cleanupFiles(filePaths: string[]): void {
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn(
            `Failed to cleanup file ${filePath}:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }
    });
  }

  cleanupProcessedFiles(videoPath: string, audioPath: string): void {
    this.cleanupFiles([videoPath, audioPath]);
  }
}
