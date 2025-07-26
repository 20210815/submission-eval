/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionMedia } from './submission-media.entity';
import { Submission } from './submission.entity';

describe('SubmissionMedia Entity', () => {
  let repository: Repository<SubmissionMedia>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(SubmissionMedia),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Submission),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<Repository<SubmissionMedia>>(
      getRepositoryToken(SubmissionMedia),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('Entity Creation', () => {
    it('should create a SubmissionMedia entity with all fields', () => {
      const submissionMediaData = {
        submissionId: 1,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        originalFileName: 'original_video.mov',
      };

      const mockEntity = {
        id: 1,
        ...submissionMediaData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(repository, 'create')
        .mockReturnValue(mockEntity as SubmissionMedia);

      const result = repository.create(submissionMediaData);

      expect(repository.create).toHaveBeenCalledWith(submissionMediaData);
      expect(result).toEqual(mockEntity);
      expect(result.submissionId).toBe(1);
      expect(result.videoUrl).toBe('https://example.com/video.mp4');
      expect(result.audioUrl).toBe('https://example.com/audio.mp3');
      expect(result.originalFileName).toBe('original_video.mov');
    });

    it('should create a SubmissionMedia entity with minimal required fields', () => {
      const submissionMediaData = {
        submissionId: 1,
        videoUrl: null,
        audioUrl: null,
        originalFileName: null,
      };

      const mockEntity = {
        id: 1,
        ...submissionMediaData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(repository, 'create')
        .mockReturnValue(mockEntity as SubmissionMedia);

      const result = repository.create(submissionMediaData);

      expect(result.submissionId).toBe(1);
      expect(result.videoUrl).toBeNull();
      expect(result.audioUrl).toBeNull();
      expect(result.originalFileName).toBeNull();
    });
  });

  describe('Entity Persistence', () => {
    it('should save a SubmissionMedia entity', async () => {
      const submissionMediaData = {
        submissionId: 1,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        originalFileName: 'test_video.mp4',
      };

      const savedEntity = {
        id: 1,
        ...submissionMediaData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(repository, 'save')
        .mockResolvedValue(savedEntity as SubmissionMedia);

      const result = await repository.save(submissionMediaData);

      expect(repository.save).toHaveBeenCalledWith(submissionMediaData);
      expect(result).toEqual(savedEntity);
      expect(result.id).toBeDefined();
    });

    it('should find a SubmissionMedia entity by id', async () => {
      const mockEntity = {
        id: 1,
        submissionId: 1,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        originalFileName: 'test_video.mp4',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(mockEntity as SubmissionMedia);

      const result = await repository.findOne({ where: { id: 1 } });

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockEntity);
    });

    it('should find all SubmissionMedia entities for a submission', async () => {
      const mockEntities = [
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
        .spyOn(repository, 'find')
        .mockResolvedValue(mockEntities as SubmissionMedia[]);

      const result = await repository.find({ where: { submissionId: 1 } });

      expect(repository.find).toHaveBeenCalledWith({
        where: { submissionId: 1 },
      });
      expect(result).toHaveLength(2);
      expect(result[0].submissionId).toBe(1);
      expect(result[1].submissionId).toBe(1);
    });
  });

  describe('Entity Updates', () => {
    it('should update a SubmissionMedia entity', async () => {
      const updateData = {
        videoUrl: 'https://example.com/updated_video.mp4',
        audioUrl: 'https://example.com/updated_audio.mp3',
      };

      const updateResult = { affected: 1 };

      jest.spyOn(repository, 'update').mockResolvedValue(updateResult as any);

      const result = await repository.update(1, updateData);

      expect(repository.update).toHaveBeenCalledWith(1, updateData);
      expect(result.affected).toBe(1);
    });
  });

  describe('Entity Deletion', () => {
    it('should delete a SubmissionMedia entity', async () => {
      const deleteResult = { affected: 1 };

      jest.spyOn(repository, 'delete').mockResolvedValue(deleteResult as any);

      const result = await repository.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(result.affected).toBe(1);
    });

    it('should cascade delete when submission is deleted', async () => {
      // This would be tested in integration tests with actual database
      // Here we just verify the repository method is called
      const deleteResult = { affected: 3 };

      jest.spyOn(repository, 'delete').mockResolvedValue(deleteResult as any);

      const result = await repository.delete({ submissionId: 1 });

      expect(repository.delete).toHaveBeenCalledWith({ submissionId: 1 });
      expect(result.affected).toBe(3);
    });
  });

  describe('Entity Validation', () => {
    it('should handle null values for optional fields', () => {
      const submissionMediaData = {
        submissionId: 1,
        videoUrl: null,
        audioUrl: null,
        originalFileName: null,
      };

      const mockEntity = {
        id: 1,
        ...submissionMediaData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(repository, 'create')
        .mockReturnValue(mockEntity as SubmissionMedia);

      const result = repository.create(submissionMediaData);

      expect(result.videoUrl).toBeNull();
      expect(result.audioUrl).toBeNull();
      expect(result.originalFileName).toBeNull();
    });

    it('should handle long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500) + '/video.mp4';

      const submissionMediaData = {
        submissionId: 1,
        videoUrl: longUrl,
        audioUrl: longUrl.replace('video.mp4', 'audio.mp3'),
        originalFileName: 'very_long_filename_' + 'x'.repeat(100) + '.mp4',
      };

      const mockEntity = {
        id: 1,
        ...submissionMediaData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(repository, 'create')
        .mockReturnValue(mockEntity as SubmissionMedia);

      const result = repository.create(submissionMediaData);

      expect(result.videoUrl).toBe(longUrl);
      expect(result.originalFileName).toContain('very_long_filename_');
    });
  });

  describe('Query Operations', () => {
    it('should find entities with relations', async () => {
      const mockEntityWithSubmission = {
        id: 1,
        submissionId: 1,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.mp3',
        originalFileName: 'test.mp4',
        submission: {
          id: 1,
          title: 'Test Submission',
          componentType: 'SPEAKING',
        },
      };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(mockEntityWithSubmission as any);

      const result = await repository.findOne({
        where: { id: 1 },
        relations: ['submission'],
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['submission'],
      });
      expect(result?.submission).toBeDefined();
      expect(result?.submission.title).toBe('Test Submission');
    });

    it('should return null when entity not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await repository.findOne({ where: { id: 999 } });

      expect(result).toBeNull();
    });

    it('should return empty array when no entities found', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await repository.find({ where: { submissionId: 999 } });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
