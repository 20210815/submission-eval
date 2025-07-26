import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionMedia } from '../entities/submission-media.entity';
import { Submission } from '../entities/submission.entity';

export interface CreateMediaDto {
  submissionId: number;
  videoUrl?: string | null;
  audioUrl?: string | null;
  originalFileName?: string | null;
}

export interface UpdateMediaDto {
  videoUrl?: string | null;
  audioUrl?: string | null;
  originalFileName?: string | null;
}

@Injectable()
export class SubmissionMediaService {
  constructor(
    @InjectRepository(SubmissionMedia)
    private readonly submissionMediaRepository: Repository<SubmissionMedia>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  async createMedia(createDto: CreateMediaDto): Promise<SubmissionMedia> {
    // 제출물 존재 확인
    const submission = await this.submissionRepository.findOne({
      where: { id: createDto.submissionId },
    });

    if (!submission) {
      throw new NotFoundException('제출물을 찾을 수 없습니다.');
    }

    // URL 유효성 검사
    this.validateMediaUrls({
      videoUrl: createDto.videoUrl,
      audioUrl: createDto.audioUrl,
    });

    const media = this.submissionMediaRepository.create(createDto);
    return await this.submissionMediaRepository.save(media);
  }

  async getMediaBySubmissionId(
    submissionId: number,
  ): Promise<SubmissionMedia[]> {
    return await this.submissionMediaRepository.find({
      where: { submissionId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMediaById(id: number): Promise<SubmissionMedia> {
    const media = await this.submissionMediaRepository.findOne({
      where: { id },
      relations: ['submission'],
    });

    if (!media) {
      throw new NotFoundException('미디어를 찾을 수 없습니다.');
    }

    return media;
  }

  async updateMedia(
    id: number,
    updateDto: UpdateMediaDto,
  ): Promise<SubmissionMedia> {
    const media = await this.submissionMediaRepository.findOne({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('미디어를 찾을 수 없습니다.');
    }

    // URL 유효성 검사
    this.validateMediaUrls({
      videoUrl: updateDto.videoUrl,
      audioUrl: updateDto.audioUrl,
    });

    Object.assign(media, updateDto);
    return await this.submissionMediaRepository.save(media);
  }

  async deleteMedia(id: number): Promise<void> {
    const media = await this.submissionMediaRepository.findOne({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('미디어를 찾을 수 없습니다.');
    }

    await this.submissionMediaRepository.delete(id);
  }

  async deleteMediaBySubmissionId(
    submissionId: number,
  ): Promise<{ affected: number }> {
    const result = await this.submissionMediaRepository.delete({
      submissionId,
    });

    return { affected: result.affected || 0 };
  }

  validateMediaUrls(urls: {
    videoUrl?: string | null;
    audioUrl?: string | null;
  }): void {
    if (urls.videoUrl && !this.isValidUrl(urls.videoUrl)) {
      throw new BadRequestException('올바르지 않은 비디오 URL 형식입니다.');
    }

    if (urls.audioUrl && !this.isValidUrl(urls.audioUrl)) {
      throw new BadRequestException('올바르지 않은 오디오 URL 형식입니다.');
    }
  }

  async getMediaWithSubmission(id: number): Promise<SubmissionMedia> {
    const media = await this.submissionMediaRepository.findOne({
      where: { id },
      relations: ['submission'],
    });

    if (!media) {
      throw new NotFoundException('미디어를 찾을 수 없습니다.');
    }

    return media;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
