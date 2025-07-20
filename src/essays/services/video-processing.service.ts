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
    const audioPath = path.join(this.tempDir, `${fileId}_audio.mp3`);

    try {
      // 1. 버퍼를 임시 파일로 저장
      fs.writeFileSync(inputPath, videoBuffer);

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
      ffmpeg(inputPath)
        .videoFilters('crop=iw/2:ih:0:0') // 좌측 50% 영역만 크롭
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private async extractAudio(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .audioCodec('mp3')
        .noVideo()
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private async removeAudio(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('copy')
        .noAudio()
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
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
