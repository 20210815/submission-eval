import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RevisionService } from './revision.service';
import { Revision, RevisionStatus } from '../entities/revision.entity';
import { Submission } from '../entities/submission.entity';
import { EvaluationLog } from '../entities/evaluation-log.entity';
import { OpenAIService } from './openai.service';
import { TextHighlightingService } from './text-highlighting.service';
import { NotificationService } from './notification.service';
import { CacheService } from '../../cache/cache.service';
import { CreateRevisionDto } from '../dto/revision.dto';
import { ComponentType } from '../enums/component-type.enum';

export interface MockRevision {
  id: number;
  submissionId: number;
  studentId: number;
  componentType: ComponentType;
  status: RevisionStatus;
  revisionReason?: string;
  score?: number;
  feedback?: string;
  highlights?: string[];
  highlightSubmitText?: string;
  errorMessage?: string;
  apiLatency?: number;
  traceId?: string;
}

describe('RevisionService', () => {
  let service: RevisionService;

  const mockRevisionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockSubmissionRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockEvaluationLogRepository = {
    save: jest.fn(),
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
    del: jest.fn(),
    getSubmissionKey: jest.fn(),
    getStudentSubmissionsKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevisionService,
        {
          provide: getRepositoryToken(Revision),
          useValue: mockRevisionRepository,
        },
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: getRepositoryToken(EvaluationLog),
          useValue: mockEvaluationLogRepository,
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
      ],
    }).compile();

    service = module.get<RevisionService>(RevisionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRevision', () => {
    const createRevisionDto: CreateRevisionDto = {
      submissionId: '1',
    };

    const mockSubmission = {
      id: 1,
      studentId: 123,
      componentType: ComponentType.WRITING,
      title: 'Test Submission',
      submitText: 'Test content',
      student: { id: 123, name: 'Test Student' },
    };

    beforeEach(() => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockRevisionRepository.findOne.mockResolvedValue(null); // No existing revision
      mockRevisionRepository.create.mockReturnValue({
        id: 1,
        submissionId: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.PENDING,
      });
      mockRevisionRepository.save.mockResolvedValue({
        id: 1,
        submissionId: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.PENDING,
      });
    });

    it('should create revision successfully', async () => {
      const result = await service.createRevision(createRevisionDto);

      expect(result).toEqual({
        id: 1,
        submissionId: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.PENDING,
        revisionReason: undefined,
        score: undefined,
        feedback: undefined,
        highlights: undefined,
        highlightSubmitText: undefined,
        errorMessage: undefined,
        apiLatency: undefined,
        traceId: undefined,
      });

      expect(mockSubmissionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['student'],
      });
      expect(mockRevisionRepository.findOne).toHaveBeenCalledWith({
        where: {
          submissionId: 1,
          status: RevisionStatus.IN_PROGRESS,
        },
      });
      expect(mockRevisionRepository.create).toHaveBeenCalledWith({
        submissionId: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.PENDING,
      });
      expect(mockRevisionRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid submission ID', async () => {
      const invalidDto = { submissionId: 'invalid' };

      await expect(service.createRevision(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createRevision(invalidDto)).rejects.toThrow(
        'Submission ID는 필수 입력 항목입니다.',
      );
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(service.createRevision(createRevisionDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createRevision(createRevisionDto)).rejects.toThrow(
        '존재하지 않는 제출물입니다.',
      );
    });

    it('should throw ConflictException when revision already in progress', async () => {
      mockRevisionRepository.findOne.mockResolvedValue({
        id: 2,
        submissionId: 1,
        status: RevisionStatus.IN_PROGRESS,
      });

      await expect(service.createRevision(createRevisionDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createRevision(createRevisionDto)).rejects.toThrow(
        '이미 진행 중인 재평가가 있습니다.',
      );
    });
  });

  describe('getRevisions', () => {
    const mockRevisions = [
      {
        id: 1,
        submissionId: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.COMPLETED,
        score: 8,
        feedback: 'Good work',
        highlights: ['excellent'],
        highlightSubmitText: '<b>excellent</b> work',
        submission: {
          student: { id: 123, name: 'Test Student' },
        },
      },
      {
        id: 2,
        submissionId: 2,
        studentId: 124,
        componentType: ComponentType.SPEAKING,
        status: RevisionStatus.PENDING,
        submission: {
          student: { id: 124, name: 'Another Student' },
        },
      },
    ];

    beforeEach(() => {
      mockRevisionRepository.findAndCount.mockResolvedValue([mockRevisions, 2]);
    });

    it('should get paginated revisions with default parameters', async () => {
      const result = await service.getRevisions();

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            submissionId: 1,
            studentId: 123,
            componentType: ComponentType.WRITING,
            status: RevisionStatus.COMPLETED,
            score: 8,
            feedback: 'Good work',
            highlights: ['excellent'],
            highlightSubmitText: '<b>excellent</b> work',
          }),
          expect.objectContaining({
            id: 2,
            submissionId: 2,
            studentId: 124,
            componentType: ComponentType.SPEAKING,
            status: RevisionStatus.PENDING,
          }),
        ]) as unknown as MockRevision[],

        total: 2,
        totalPages: 1,
      });

      expect(mockRevisionRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['submission', 'submission.student'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should get paginated revisions with custom parameters', async () => {
      await service.getRevisions(2, 10, 'id,ASC');

      expect(mockRevisionRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['submission', 'submission.student'],
        order: { id: 'ASC' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('getRevisionById', () => {
    const mockRevision = {
      id: 1,
      submissionId: 1,
      studentId: 123,
      componentType: ComponentType.WRITING,
      status: RevisionStatus.COMPLETED,
      score: 8,
      feedback: 'Good work',
      highlights: ['excellent'],
      highlightSubmitText: '<b>excellent</b> work',
      submission: {
        student: { id: 123, name: 'Test Student' },
      },
    };

    it('should get revision by ID successfully', async () => {
      mockRevisionRepository.findOne.mockResolvedValue(mockRevision);

      const result = await service.getRevisionById(1);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          submissionId: 1,
          studentId: 123,
          componentType: ComponentType.WRITING,
          status: RevisionStatus.COMPLETED,
          score: 8,
          feedback: 'Good work',
          highlights: ['excellent'],
          highlightSubmitText: '<b>excellent</b> work',
        }),
      );

      expect(mockRevisionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['submission', 'submission.student'],
      });
    });

    it('should throw NotFoundException when revision not found', async () => {
      mockRevisionRepository.findOne.mockResolvedValue(null);

      await expect(service.getRevisionById(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getRevisionById(999)).rejects.toThrow(
        '존재하지 않는 재평가 ID입니다.',
      );
    });
  });

  describe('processRevision (private method)', () => {
    const mockRevision = {
      id: 1,
      submissionId: 1,
      studentId: 123,
      componentType: ComponentType.WRITING,
      status: RevisionStatus.PENDING,
      submission: {
        id: 1,
        title: 'Test Submission',
        submitText: 'Test content for evaluation',
        studentId: 123,
      },
    };

    const mockAIResult = {
      score: 8,
      feedback: 'Great work with minor improvements needed',
      highlights: ['great work', 'improvements'],
    };

    beforeEach(() => {
      mockRevisionRepository.findOne.mockResolvedValue(mockRevision);
      mockRevisionRepository.update.mockResolvedValue({ affected: 1 });
      mockSubmissionRepository.findOne.mockResolvedValue(
        mockRevision.submission,
      );
      mockSubmissionRepository.update.mockResolvedValue({ affected: 1 });
      mockOpenAIService.evaluateSubmission.mockResolvedValue(mockAIResult);
      mockTextHighlightingService.highlightText.mockReturnValue(
        'Test content with <b>great work</b> and <b>improvements</b>',
      );
      mockEvaluationLogRepository.save.mockResolvedValue({});
      mockCacheService.getSubmissionKey.mockReturnValue('submission:1');
      mockCacheService.getStudentSubmissionsKey.mockReturnValue(
        'student:123:submissions',
      );
      mockCacheService.del.mockResolvedValue(true);
    });

    it('should process revision successfully when called via createRevision', async () => {
      const createRevisionDto: CreateRevisionDto = { submissionId: '1' };

      // Mock the submission for createRevision
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        title: 'Test Submission',
        submitText: 'Test content',
        student: { id: 123, name: 'Test Student' },
      });

      mockRevisionRepository.findOne
        .mockResolvedValueOnce(null) // No existing revision in progress
        .mockResolvedValueOnce(mockRevision); // Return revision for processRevision

      mockRevisionRepository.create.mockReturnValue(mockRevision);
      mockRevisionRepository.save.mockResolvedValue(mockRevision);

      // Create revision which triggers processRevision asynchronously
      await service.createRevision(createRevisionDto);

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify that the revision was updated to IN_PROGRESS and then COMPLETED
      expect(mockRevisionRepository.update).toHaveBeenCalledWith(1, {
        status: RevisionStatus.IN_PROGRESS,
      });

      expect(mockOpenAIService.evaluateSubmission).toHaveBeenCalledWith(
        'Test Submission',
        'Test content for evaluation',
        ComponentType.WRITING,
      );

      expect(mockTextHighlightingService.highlightText).toHaveBeenCalledWith(
        'Test content for evaluation',
        ['great work', 'improvements'],
      );
    });

    it('should handle AI evaluation failure and notify', async () => {
      const error = new Error('AI service unavailable');
      mockOpenAIService.evaluateSubmission.mockRejectedValue(error);

      const createRevisionDto: CreateRevisionDto = { submissionId: '1' };

      // Mock the submission for createRevision
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        title: 'Test Submission',
        submitText: 'Test content',
        student: { id: 123, name: 'Test Student' },
      });

      mockRevisionRepository.findOne
        .mockResolvedValueOnce(null) // No existing revision in progress
        .mockResolvedValueOnce(mockRevision) // Return revision for processRevision
        .mockResolvedValueOnce(mockRevision); // Return revision again for error handling

      mockRevisionRepository.create.mockReturnValue(mockRevision);
      mockRevisionRepository.save.mockResolvedValue(mockRevision);

      // Create revision which triggers processRevision asynchronously
      await service.createRevision(createRevisionDto);

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify that the revision was marked as failed
      expect(mockRevisionRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: RevisionStatus.FAILED,
          errorMessage: 'AI service unavailable',
        }),
      );

      // Verify that notification was sent
      expect(
        mockNotificationService.notifyEvaluationFailure,
      ).toHaveBeenCalledWith(
        1, // submissionId
        123, // studentId
        'AI service unavailable',
        expect.any(String), // traceId
      );
    });
  });
});
