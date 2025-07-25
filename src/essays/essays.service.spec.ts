import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EssaysService } from './essays.service';
import {
  Essay,
  ComponentType,
  EvaluationStatus,
} from './entities/essay.entity';
import { EvaluationLog } from './entities/evaluation-log.entity';
import { Student } from '../students/entities/student.entity';
import { VideoProcessingService } from './services/video-processing.service';
import { AzureStorageService } from './services/azure-storage.service';
import { OpenAIService } from './services/openai.service';
import { TextHighlightingService } from './services/text-highlighting.service';
import { NotificationService } from './services/notification.service';
import { SubmitEssayDto } from './dto/submit-essay.dto';

describe('EssaysService', () => {
  let service: EssaysService;

  const mockEssayRepository = {
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

  const mockVideoProcessingService = {
    processVideo: jest.fn(),
    cleanupProcessedFiles: jest.fn(),
  };

  const mockAzureStorageService = {
    uploadVideo: jest.fn(),
    uploadAudio: jest.fn(),
  };

  const mockOpenAIService = {
    evaluateEssay: jest.fn(),
  };

  const mockTextHighlightingService = {
    highlightText: jest.fn(),
  };

  const mockNotificationService = {
    notifyEvaluationFailure: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EssaysService,
        {
          provide: getRepositoryToken(Essay),
          useValue: mockEssayRepository,
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
      ],
    }).compile();

    service = module.get<EssaysService>(EssaysService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitEssay', () => {
    const studentId = 1;
    const submitEssayDto: SubmitEssayDto = {
      title: '테스트 에세이',
      submitText: '테스트 내용입니다.',
      componentType: ComponentType.WRITING,
    };

    beforeEach(() => {
      // Mock successful flow
      mockEssayRepository.findOne.mockResolvedValue(null);
      mockEssayRepository.create.mockReturnValue({ id: 1, ...submitEssayDto });
      mockEssayRepository.save.mockResolvedValue({ id: 1, ...submitEssayDto });
      mockStudentRepository.findOne.mockResolvedValue({
        id: studentId,
        name: '테스트학생',
      });

      mockOpenAIService.evaluateEssay.mockResolvedValue({
        score: 85,
        feedback: '좋은 에세이입니다.',
        highlights: ['좋은', '에세이'],
      });

      mockTextHighlightingService.highlightText.mockReturnValue(
        '테스트 내용입니다. <mark>좋은</mark> <mark>에세이</mark>',
      );

      mockEvaluationLogRepository.create.mockReturnValue({});
      mockEvaluationLogRepository.save.mockResolvedValue({});
    });

    it('should submit essay successfully without video', async () => {
      // Final essay state after evaluation
      mockEssayRepository.findOne
        .mockResolvedValueOnce(null) // Check for existing essay
        .mockResolvedValueOnce({
          // Return saved essay for processing
          id: 1,
          ...submitEssayDto,
          studentId,
          status: EvaluationStatus.PENDING,
        })
        .mockResolvedValueOnce({
          // Return completed essay after evaluation
          id: 1,
          ...submitEssayDto,
          studentId,
          status: EvaluationStatus.COMPLETED,
          score: 85,
          feedback: '좋은 에세이입니다.',
          highlights: ['좋은', '에세이'],
          highlightSubmitText:
            '테스트 내용입니다. <mark>좋은</mark> <mark>에세이</mark>',
        });

      const result = await service.submitEssay(studentId, submitEssayDto);

      expect(result).toMatchObject({
        essayId: 1,
        studentId,
        studentName: '테스트학생',
        status: EvaluationStatus.COMPLETED,
        score: 85,
        feedback: '좋은 에세이입니다.',
        highlights: ['좋은', '에세이'],
        submitText: submitEssayDto.submitText,
        highlightSubmitText: expect.stringContaining('<mark>') as string,
        apiLatency: expect.any(Number) as number,
      });

      expect(mockEssayRepository.findOne).toHaveBeenCalledWith({
        where: { studentId, componentType: ComponentType.WRITING },
      });
      expect(mockOpenAIService.evaluateEssay).toHaveBeenCalled();
      expect(mockTextHighlightingService.highlightText).toHaveBeenCalled();
    });

    it('should throw ConflictException when essay already exists', async () => {
      mockEssayRepository.findOne.mockResolvedValue({
        id: 1,
        studentId,
        componentType: ComponentType.WRITING,
      });

      await expect(
        service.submitEssay(studentId, submitEssayDto),
      ).rejects.toThrow(ConflictException);

      expect(mockEssayRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when student is already processing', async () => {
      // Start first submission
      const promise1 = service.submitEssay(studentId, submitEssayDto);

      // Try second submission immediately
      const promise2 = service.submitEssay(studentId, {
        ...submitEssayDto,
        componentType: ComponentType.SPEAKING,
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

      mockEssayRepository.findOne
        .mockResolvedValueOnce(null) // Check for existing essay
        .mockResolvedValueOnce({
          // Return saved essay for processing
          id: 1,
          ...submitEssayDto,
          studentId,
          status: EvaluationStatus.PENDING,
        })
        .mockResolvedValueOnce({
          // Return completed essay after evaluation
          id: 1,
          ...submitEssayDto,
          studentId,
          status: EvaluationStatus.COMPLETED,
          videoUrl: 'https://example.com/video.mp4',
          audioUrl: 'https://example.com/audio.wav',
        });

      const result = await service.submitEssay(
        studentId,
        submitEssayDto,
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

  describe('getEssay', () => {
    const essayId = 1;
    const studentId = 1;

    it('should get essay successfully', async () => {
      const mockEssay = {
        id: essayId,
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

      mockEssayRepository.findOne.mockResolvedValue(mockEssay);

      const result = await service.getEssay(essayId, studentId);

      expect(mockEssayRepository.findOne).toHaveBeenCalledWith({
        where: { id: essayId, studentId },
      });
      expect(result).toMatchObject({
        id: essayId,
        title: mockEssay.title,
        submitText: mockEssay.submitText,
        componentType: mockEssay.componentType,
        status: mockEssay.status,
        score: mockEssay.score,
        feedback: mockEssay.feedback,
        highlights: mockEssay.highlights,
      });
    });

    it('should throw NotFoundException when essay not found', async () => {
      mockEssayRepository.findOne.mockResolvedValue(null);

      await expect(service.getEssay(essayId, studentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStudentEssays', () => {
    const studentId = 1;

    it('should get student essays successfully', async () => {
      const mockEssays = [
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

      mockEssayRepository.find.mockResolvedValue(mockEssays);

      const result = await service.getStudentEssays(studentId);

      expect(mockEssayRepository.find).toHaveBeenCalledWith({
        where: { studentId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('첫 번째 에세이');
      expect(result[1].title).toBe('두 번째 에세이');
    });

    it('should return empty array when no essays found', async () => {
      mockEssayRepository.find.mockResolvedValue([]);

      const result = await service.getStudentEssays(studentId);

      expect(result).toEqual([]);
    });
  });
});
