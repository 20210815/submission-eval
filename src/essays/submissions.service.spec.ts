import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { Submission, EvaluationStatus } from './entities/submission.entity';
import { EvaluationLog } from './entities/evaluation-log.entity';
import { Student } from '../students/entities/student.entity';
import { VideoProcessingService } from './services/video-processing.service';
import { AzureStorageService } from './services/azure-storage.service';
import { OpenAIService } from './services/openai.service';
import { TextHighlightingService } from './services/text-highlighting.service';
import { NotificationService } from './services/notification.service';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { CacheService } from '../cache/cache.service';
import { ComponentType } from './enums/component-type.enum';
import { Revision } from './entities/revision.entity';

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  const mockSubmissionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockEvaluationLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockStudentRepository = {
    findOne: jest.fn(),
  };

  const mockRevisionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockVideoProcessingService = {
    processVideo: jest.fn(),
    cleanupProcessedFiles: jest.fn(),
  };

  const mockAzureStorageService = {
    uploadVideo: jest.fn(),
    uploadAudio: jest.fn(),
  };

  const mockOpenAIService = {
    evaluateSubmission: jest.fn(),
  };

  const mockTextHighlightingService = {
    highlightText: jest.fn(),
  };

  const mockNotificationService = {
    notifyEvaluationFailure: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getStudentKey: jest.fn(),
    getStudentSubmissionsKey: jest.fn(),
    getSubmissionKey: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: getRepositoryToken(EvaluationLog),
          useValue: mockEvaluationLogRepository,
        },
        {
          provide: getRepositoryToken(Student),
          useValue: mockStudentRepository,
        },
        {
          provide: getRepositoryToken(Revision),
          useValue: mockRevisionRepository,
        },
        {
          provide: VideoProcessingService,
          useValue: mockVideoProcessingService,
        },
        {
          provide: AzureStorageService,
          useValue: mockAzureStorageService,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
        {
          provide: TextHighlightingService,
          useValue: mockTextHighlightingService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitSubmission', () => {
    const studentId = 1;
    const submitSubmissionDto: SubmitSubmissionDto = {
      title: '테스트 제출물',
      submitText: '테스트 내용입니다.',
      componentType: ComponentType.WRITING,
    };

    beforeEach(() => {
      // Mock successful flow
      mockSubmissionRepository.findOne.mockResolvedValue(null);
      mockSubmissionRepository.create.mockReturnValue({
        id: 1,
        ...submitSubmissionDto,
      });
      mockSubmissionRepository.save.mockResolvedValue({
        id: 1,
        ...submitSubmissionDto,
      });
      mockStudentRepository.findOne.mockResolvedValue({
        id: studentId,
        name: '테스트학생',
      });

      mockOpenAIService.evaluateSubmission.mockResolvedValue({
        score: 8,
        feedback: '좋은 에세이입니다.',
        highlights: ['좋은', '에세이'],
      });

      mockTextHighlightingService.highlightText.mockReturnValue(
        '테스트 내용입니다. <mark>좋은</mark> <mark>에세이</mark>',
      );

      mockEvaluationLogRepository.create.mockReturnValue({});
      mockEvaluationLogRepository.save.mockResolvedValue({});

      // Mock DataSource transaction
      mockDataSource.transaction.mockImplementation(
        async (callback: (manager: any) => Promise<any>) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null), // No existing submission in transaction
            save: jest
              .fn()
              .mockResolvedValue({ id: 1, ...submitSubmissionDto }),
            create: jest
              .fn()
              .mockReturnValue({ id: 1, ...submitSubmissionDto }),
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return await callback(mockManager);
        },
      );

      // Mock cache methods for student and submission caching
      mockCacheService.getStudentKey.mockReturnValue(`student:${studentId}`);
      mockCacheService.get.mockResolvedValue(null); // No cached data
      mockCacheService.set.mockResolvedValue(undefined);
    });

    it('should submit essay successfully without video', async () => {
      // Mock the essay repository call to get the evaluated essay (after evaluation)
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 1,
        ...submitSubmissionDto,
        studentId,
        status: EvaluationStatus.COMPLETED,
        score: 85,
        feedback: '좋은 에세이입니다.',
        highlights: ['좋은', '에세이'],
        highlightSubmitText:
          '테스트 내용입니다. <mark>좋은</mark> <mark>에세이</mark>',
      });

      const result = await service.submitSubmission(
        studentId,
        submitSubmissionDto,
      );

      expect(result).toMatchObject({
        submissionId: 1,
        studentId,
        studentName: '테스트학생',
        status: EvaluationStatus.COMPLETED,
        score: 85,
        feedback: '좋은 에세이입니다.',
        highlights: ['좋은', '에세이'],
        submitText: submitSubmissionDto.submitText,
        highlightSubmitText: expect.stringContaining('<mark>') as string,
        apiLatency: expect.any(Number) as number,
      });

      expect(mockOpenAIService.evaluateSubmission).toHaveBeenCalled();
      expect(mockTextHighlightingService.highlightText).toHaveBeenCalled();
    });

    it('should throw ConflictException when essay already exists', async () => {
      // Mock DataSource transaction to find existing essay
      mockDataSource.transaction.mockImplementation(
        async (callback: (manager: any) => Promise<any>) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue({
              id: 1,
              studentId,
              componentType: ComponentType.WRITING,
            }), // Essay already exists
            save: jest.fn(),
            create: jest.fn(),
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return await callback(mockManager);
        },
      );

      await expect(
        service.submitSubmission(studentId, submitSubmissionDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when student is already processing', async () => {
      // Start first submission
      const promise1 = service.submitSubmission(studentId, submitSubmissionDto);

      // Try second submission immediately with same componentType
      const promise2 = service.submitSubmission(studentId, {
        ...submitSubmissionDto,
        title: '다른 제목',
      });

      const results = await Promise.allSettled([promise1, promise2]);

      const hasConflictException = results.some(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof ConflictException &&
          result.reason.message.includes('진행 중'),
      );

      expect(hasConflictException).toBe(true);
    });

    it('should handle video file processing', async () => {
      const mockVideoFile = {
        buffer: Buffer.from('fake video'),
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      mockVideoProcessingService.processVideo.mockResolvedValue({
        videoPath: '/tmp/video.mp4',
        audioPath: '/tmp/audio.wav',
      });

      mockAzureStorageService.uploadVideo.mockResolvedValue({
        url: 'https://example.com/video.mp4',
        sasUrl: 'https://example.com/video.mp4',
        blobName: 'video.mp4',
      });

      mockAzureStorageService.uploadAudio.mockResolvedValue({
        url: 'https://example.com/audio.wav',
        sasUrl: 'https://example.com/audio.wav',
        blobName: 'audio.wav',
      });

      // Mock the essay repository call to get the evaluated essay (after evaluation)
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 1,
        ...submitSubmissionDto,
        studentId,
        status: EvaluationStatus.COMPLETED,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.wav',
      });

      const result = await service.submitSubmission(
        studentId,
        submitSubmissionDto,
        mockVideoFile,
      );

      expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(
        mockVideoFile.buffer,
      );
      expect(mockAzureStorageService.uploadVideo).toHaveBeenCalled();
      expect(mockAzureStorageService.uploadAudio).toHaveBeenCalled();
      expect(result.videoUrl).toBe('https://example.com/video.mp4');
      expect(result.audioUrl).toBe('https://example.com/audio.wav');
    });
  });

  describe('getSubmission', () => {
    const submissionId = 1;
    const studentId = 1;

    it('should get submission successfully', async () => {
      const mockSubmission = {
        id: submissionId,
        title: '테스트 에세이',
        submitText: '테스트 내용',
        componentType: ComponentType.WRITING,
        status: EvaluationStatus.COMPLETED,
        score: 85,
        feedback: '좋은 에세이입니다.',
        highlights: ['좋은', '에세이'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock cache service - no cached submission
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.getSubmissionKey.mockReturnValue(
        `submission:${submissionId}`,
      );

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);

      const result = await service.getSubmission(submissionId, studentId);

      expect(mockSubmissionRepository.findOne).toHaveBeenCalledWith({
        where: { id: submissionId, studentId },
      });
      expect(result).toMatchObject({
        id: submissionId,
        title: mockSubmission.title,
        submitText: mockSubmission.submitText,
        componentType: mockSubmission.componentType,
        status: mockSubmission.status,
        score: mockSubmission.score,
        feedback: mockSubmission.feedback,
        highlights: mockSubmission.highlights,
      });
    });

    it('should throw NotFoundException when submission not found', async () => {
      // Mock cache service - no cached submission
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.getSubmissionKey.mockReturnValue(
        `submission:${submissionId}`,
      );

      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSubmission(submissionId, studentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStudentSubmissions', () => {
    const studentId = 1;

    it('should get student submissions successfully', async () => {
      const mockSubmissions = [
        {
          id: 1,
          title: '첫 번째 에세이',
          submitText: '첫 번째 내용',
          componentType: ComponentType.WRITING,
          status: EvaluationStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          title: '두 번째 에세이',
          submitText: '두 번째 내용',
          componentType: ComponentType.SPEAKING,
          status: EvaluationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock cache service - no cached essays
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.getStudentSubmissionsKey.mockReturnValue(
        `student-submissions:${studentId}`,
      );

      mockSubmissionRepository.find.mockResolvedValue(mockSubmissions);

      const result = await service.getStudentSubmissions(studentId);

      expect(mockSubmissionRepository.find).toHaveBeenCalledWith({
        where: { studentId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('첫 번째 에세이');
      expect(result[1].title).toBe('두 번째 에세이');
    });

    it('should return empty array when no essays found', async () => {
      // Mock cache service - no cached submissions
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.getStudentSubmissionsKey.mockReturnValue(
        `student-submissions:${studentId}`,
      );

      mockSubmissionRepository.find.mockResolvedValue([]);

      const result = await service.getStudentSubmissions(studentId);

      expect(result).toEqual([]);
    });
  });
});
