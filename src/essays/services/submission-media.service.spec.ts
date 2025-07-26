/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmissionMediaService } from './submission-media.service';
import { SubmissionMedia } from '../entities/submission-media.entity';
import { Submission } from '../entities/submission.entity';

describe('SubmissionMediaService', () => {
  let service: SubmissionMediaService;
  let submissionMediaRepository: Repository<SubmissionMedia>;
  let submissionRepository: Repository<Submission>;

  const mockSubmissionMediaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSubmissionRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionMediaService,
        {
          provide: getRepositoryToken(SubmissionMedia),
          useValue: mockSubmissionMediaRepository,
        },
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepository,
        },
      ],
    }).compile();

    service = module.get<SubmissionMediaService>(SubmissionMediaService);
    submissionMediaRepository = module.get<Repository<SubmissionMedia>>(
      getRepositoryToken(SubmissionMedia),
    );
    submissionRepository = module.get<Repository<Submission>>(
      getRepositoryToken(Submission),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMedia', () => {
    const mockSubmission = {
      id: 1,
      title: 'Test Submission',
      studentId: 1,
    };

    const createMediaDto = {
      submissionId: 1,
      videoUrl: 'https://example.com/video.mp4',
      audioUrl: 'https://example.com/audio.mp3',
      originalFileName: 'test_video.mp4',
    };

    it('should create submission media successfully', async () => {
      const mockCreatedMedia = {
        id: 1,
        ...createMediaDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(submissionRepository, 'findOne')
        .mockResolvedValue(mockSubmission as Submission);
      jest
        .spyOn(submissionMediaRepository, 'create')
        .mockReturnValue(mockCreatedMedia as SubmissionMedia);
      jest
        .spyOn(submissionMediaRepository, 'save')
        .mockResolvedValue(mockCreatedMedia as SubmissionMedia);

      const result = await service.createMedia(createMediaDto);

      expect(submissionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(submissionMediaRepository.create).toHaveBeenCalledWith(
        createMediaDto,
      );
      expect(submissionMediaRepository.save).toHaveBeenCalledWith(
        mockCreatedMedia,
      );
      expect(result).toEqual(mockCreatedMedia);
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      jest.spyOn(submissionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createMedia(createMediaDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createMedia(createMediaDto)).rejects.toThrow(
        '제출물을 찾을 수 없습니다.',
      );

      expect(submissionMediaRepository.create).not.toHaveBeenCalled();
      expect(submissionMediaRepository.save).not.toHaveBeenCalled();
    });

    it('should create media with minimal data', async () => {
      const minimalCreateDto = {
        submissionId: 1,
        videoUrl: null,
        audioUrl: null,
        originalFileName: null,
      };

      const mockCreatedMedia = {
        id: 1,
        ...minimalCreateDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(submissionRepository, 'findOne')
        .mockResolvedValue(mockSubmission as Submission);
      jest
        .spyOn(submissionMediaRepository, 'create')
        .mockReturnValue(mockCreatedMedia as SubmissionMedia);
      jest
        .spyOn(submissionMediaRepository, 'save')
        .mockResolvedValue(mockCreatedMedia as SubmissionMedia);

      const result = await service.createMedia(minimalCreateDto);

      expect(result.videoUrl).toBeNull();
      expect(result.audioUrl).toBeNull();
      expect(result.originalFileName).toBeNull();
    });
  });

  describe('getMediaBySubmissionId', () => {
    it('should return media list for a submission', async () => {
      const mockMediaList = [
        {
          id: 1,
          submissionId: 1,
          videoUrl: 'https://example.com/video1.mp4',
          audioUrl: 'https://example.com/audio1.mp3',
          originalFileName: 'video1.mp4',
        },
        {
          id: 2,
          submissionId: 1,
          videoUrl: 'https://example.com/video2.mp4',
          audioUrl: 'https://example.com/audio2.mp3',
          originalFileName: 'video2.mp4',
        },
      ];

      jest
        .spyOn(submissionMediaRepository, 'find')
        .mockResolvedValue(mockMediaList as SubmissionMedia[]);

      const result = await service.getMediaBySubmissionId(1);

      expect(submissionMediaRepository.find).toHaveBeenCalledWith({
        where: { submissionId: 1 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockMediaList);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no media found', async () => {
      jest.spyOn(submissionMediaRepository, 'find').mockResolvedValue([]);

      const result = await service.getMediaBySubmissionId(1);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getMediaById', () => {
    it('should return media by id', async () => {
      const mockMedia = {
        id: 1,
        submissionId: 1,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        originalFileName: 'test.mp4',
      };

      jest
        .spyOn(submissionMediaRepository, 'findOne')
        .mockResolvedValue(mockMedia as SubmissionMedia);

      const result = await service.getMediaById(1);

      expect(submissionMediaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['submission'],
      });
      expect(result).toEqual(mockMedia);
    });

    it('should throw NotFoundException when media not found', async () => {
      jest.spyOn(submissionMediaRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getMediaById(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMediaById(999)).rejects.toThrow(
        '미디어를 찾을 수 없습니다.',
      );
    });
  });

  describe('updateMedia', () => {
    const updateDto = {
      videoUrl: 'https://example.com/updated_video.mp4',
      audioUrl: 'https://example.com/updated_audio.mp3',
    };

    it('should update media successfully', async () => {
      const mockExistingMedia = {
        id: 1,
        submissionId: 1,
        videoUrl: 'https://example.com/old_video.mp4',
        audioUrl: 'https://example.com/old_audio.mp3',
        originalFileName: 'test.mp4',
      };

      const mockUpdatedMedia = {
        ...mockExistingMedia,
        ...updateDto,
      };

      jest
        .spyOn(submissionMediaRepository, 'findOne')
        .mockResolvedValue(mockExistingMedia as SubmissionMedia);
      jest
        .spyOn(submissionMediaRepository, 'save')
        .mockResolvedValue(mockUpdatedMedia as SubmissionMedia);

      const result = await service.updateMedia(1, updateDto);

      expect(submissionMediaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(submissionMediaRepository.save).toHaveBeenCalledWith({
        ...mockExistingMedia,
        ...updateDto,
      });
      expect(result.videoUrl).toBe(updateDto.videoUrl);
      expect(result.audioUrl).toBe(updateDto.audioUrl);
    });

    it('should throw NotFoundException when media not found', async () => {
      jest.spyOn(submissionMediaRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateMedia(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateMedia(999, updateDto)).rejects.toThrow(
        '미디어를 찾을 수 없습니다.',
      );

      expect(submissionMediaRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteMedia', () => {
    it('should delete media successfully', async () => {
      const mockMedia = {
        id: 1,
        submissionId: 1,
        videoUrl: 'https://example.com/video.mp4',
      };

      const deleteResult = { affected: 1 };

      jest
        .spyOn(submissionMediaRepository, 'findOne')
        .mockResolvedValue(mockMedia as SubmissionMedia);
      jest
        .spyOn(submissionMediaRepository, 'delete')
        .mockResolvedValue(deleteResult as any);

      await service.deleteMedia(1);

      expect(submissionMediaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(submissionMediaRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when media not found', async () => {
      jest.spyOn(submissionMediaRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteMedia(999)).rejects.toThrow(NotFoundException);
      await expect(service.deleteMedia(999)).rejects.toThrow(
        '미디어를 찾을 수 없습니다.',
      );

      expect(submissionMediaRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteMediaBySubmissionId', () => {
    it('should delete all media for a submission', async () => {
      const deleteResult = { affected: 3 };

      jest
        .spyOn(submissionMediaRepository, 'delete')
        .mockResolvedValue(deleteResult as any);

      const result = await service.deleteMediaBySubmissionId(1);

      expect(submissionMediaRepository.delete).toHaveBeenCalledWith({
        submissionId: 1,
      });
      expect(result.affected).toBe(3);
    });

    it('should return zero affected when no media found', async () => {
      const deleteResult = { affected: 0 };

      jest
        .spyOn(submissionMediaRepository, 'delete')
        .mockResolvedValue(deleteResult as any);

      const result = await service.deleteMediaBySubmissionId(999);

      expect(result.affected).toBe(0);
    });
  });

  describe('validateMediaUrls', () => {
    it('should validate correct media URLs', () => {
      const validUrls = {
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
      };

      expect(() => service.validateMediaUrls(validUrls)).not.toThrow();
    });

    it('should throw BadRequestException for invalid video URL', () => {
      const invalidUrls = {
        videoUrl: 'invalid-url',
        audioUrl: 'https://example.com/audio.mp3',
      };

      expect(() => service.validateMediaUrls(invalidUrls)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateMediaUrls(invalidUrls)).toThrow(
        '올바르지 않은 비디오 URL 형식입니다.',
      );
    });

    it('should throw BadRequestException for invalid audio URL', () => {
      const invalidUrls = {
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'not-a-url',
      };

      expect(() => service.validateMediaUrls(invalidUrls)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateMediaUrls(invalidUrls)).toThrow(
        '올바르지 않은 오디오 URL 형식입니다.',
      );
    });

    it('should allow null URLs', () => {
      const nullUrls = {
        videoUrl: null,
        audioUrl: null,
      };

      expect(() => service.validateMediaUrls(nullUrls)).not.toThrow();
    });
  });

  describe('getMediaWithSubmission', () => {
    it('should return media with submission data', async () => {
      const mockMediaWithSubmission = {
        id: 1,
        submissionId: 1,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        originalFileName: 'test.mp4',
        submission: {
          id: 1,
          title: 'Test Submission',
          componentType: 'SPEAKING',
          studentId: 1,
        },
      };

      jest
        .spyOn(submissionMediaRepository, 'findOne')
        .mockResolvedValue(mockMediaWithSubmission as any);

      const result = await service.getMediaWithSubmission(1);

      expect(submissionMediaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['submission'],
      });
      expect(result.submission).toBeDefined();
      expect(result.submission.title).toBe('Test Submission');
    });

    it('should throw NotFoundException when media with submission not found', async () => {
      jest.spyOn(submissionMediaRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getMediaWithSubmission(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
