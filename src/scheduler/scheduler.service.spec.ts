import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import {
  Submission,
  EvaluationStatus,
} from '../essays/entities/submission.entity';
import { Revision, RevisionStatus } from '../essays/entities/revision.entity';
import { OpenAIService } from '../essays/services/openai.service';
import { TextHighlightingService } from '../essays/services/text-highlighting.service';
import { NotificationService } from '../essays/services/notification.service';
import { ComponentType } from '../essays/enums/component-type.enum';

describe('SchedulerService', () => {
  let service: SchedulerService;

  const mockSubmissionRepository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockRevisionRepository = {
    create: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: getRepositoryToken(Revision),
          useValue: mockRevisionRepository,
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

    service = module.get<SchedulerService>(SchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('autoRetryFailedSubmissions', () => {
    const mockFailedSubmissions = [
      {
        id: 1,
        title: 'Failed Submission 1',
        submitText: 'Content 1',
        componentType: ComponentType.WRITING,
        studentId: 123,
        status: EvaluationStatus.FAILED,
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        student: { id: 123, name: 'Student 1' },
      },
      {
        id: 2,
        title: 'Failed Submission 2',
        submitText: 'Content 2',
        componentType: ComponentType.SPEAKING,
        studentId: 124,
        status: EvaluationStatus.FAILED,
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        student: { id: 124, name: 'Student 2' },
      },
    ];

    const mockAIResult = {
      score: 8,
      feedback: 'Good improvement after retry',
      highlights: ['improvement', 'good work'],
    };

    beforeEach(() => {
      mockSubmissionRepository.find.mockResolvedValue(mockFailedSubmissions);
      mockOpenAIService.evaluateSubmission.mockResolvedValue(mockAIResult);
      mockTextHighlightingService.highlightText.mockReturnValue(
        'Content with <b>improvement</b> and <b>good work</b>',
      );
      mockSubmissionRepository.update.mockResolvedValue({ affected: 1 });
      mockRevisionRepository.create.mockReturnValue({
        id: 1,
        submissionId: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.COMPLETED,
      });
      mockRevisionRepository.save.mockResolvedValue({
        id: 1,
        submissionId: 1,
        studentId: 123,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.COMPLETED,
      });
    });

    it('should retry failed submissions successfully', async () => {
      await service.autoRetryFailedSubmissions();

      // Verify that failed submissions were queried correctly
      expect(mockSubmissionRepository.find).toHaveBeenCalledWith({
        where: {
          status: EvaluationStatus.FAILED,
          updatedAt: expect.any(Object) as unknown,
        },
        relations: ['student'],
        take: 10,
      });

      // Verify that each submission was processed
      expect(mockOpenAIService.evaluateSubmission).toHaveBeenCalledTimes(2);
      expect(mockTextHighlightingService.highlightText).toHaveBeenCalledTimes(
        2,
      );

      // Verify submissions were updated to COMPLETED
      expect(mockSubmissionRepository.update).toHaveBeenCalledWith(1, {
        status: EvaluationStatus.COMPLETED,
        score: 8,
        feedback: 'Good improvement after retry',
        highlights: ['improvement', 'good work'],
        highlightSubmitText:
          'Content with <b>improvement</b> and <b>good work</b>',
        errorMessage: null,
      });

      expect(mockSubmissionRepository.update).toHaveBeenCalledWith(2, {
        status: EvaluationStatus.COMPLETED,
        score: 8,
        feedback: 'Good improvement after retry',
        highlights: ['improvement', 'good work'],
        highlightSubmitText:
          'Content with <b>improvement</b> and <b>good work</b>',
        errorMessage: null,
      });

      // Verify revisions were created
      expect(mockRevisionRepository.create).toHaveBeenCalledTimes(2);
      expect(mockRevisionRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle retry failures and create failed revisions', async () => {
      const error = new Error('AI service unavailable');
      mockOpenAIService.evaluateSubmission.mockRejectedValue(error);

      await service.autoRetryFailedSubmissions();

      // Verify submissions were updated to FAILED status
      expect(mockSubmissionRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: EvaluationStatus.FAILED,
          errorMessage: 'AI service unavailable',
        }),
      );

      // Verify failed revisions were created
      expect(mockRevisionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: 1,
          studentId: 123,
          componentType: ComponentType.WRITING,
          revisionReason: 'Auto-retry for failed evaluation',
          status: RevisionStatus.FAILED,
          errorMessage: 'AI service unavailable',
        }),
      );

      // Verify failure notifications were sent
      expect(
        mockNotificationService.notifyEvaluationFailure,
      ).toHaveBeenCalledWith(
        1,
        123,
        'AI service unavailable',
        expect.any(String), // traceId
      );
    });

    it('should handle empty failed submissions list', async () => {
      mockSubmissionRepository.find.mockResolvedValue([]);

      await service.autoRetryFailedSubmissions();

      expect(mockOpenAIService.evaluateSubmission).not.toHaveBeenCalled();
      expect(mockSubmissionRepository.update).not.toHaveBeenCalled();
      expect(mockRevisionRepository.create).not.toHaveBeenCalled();
    });

    it('should update status to PROCESSING before retry', async () => {
      await service.autoRetryFailedSubmissions();

      // Verify that status was first updated to PROCESSING
      expect(mockSubmissionRepository.update).toHaveBeenCalledWith(1, {
        status: EvaluationStatus.PROCESSING,
      });

      expect(mockSubmissionRepository.update).toHaveBeenCalledWith(2, {
        status: EvaluationStatus.PROCESSING,
      });
    });

    it('should limit retry to 10 submissions', async () => {
      const manyFailedSubmissions = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        title: `Failed Submission ${i + 1}`,
        submitText: `Content ${i + 1}`,
        componentType: ComponentType.WRITING,
        studentId: 123 + i,
        status: EvaluationStatus.FAILED,
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        student: { id: 123 + i, name: `Student ${i + 1}` },
      }));

      mockSubmissionRepository.find.mockResolvedValue(manyFailedSubmissions);

      await service.autoRetryFailedSubmissions();

      expect(mockSubmissionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('generateStats methods', () => {
    const mockSubmissions = [
      {
        id: 1,
        status: EvaluationStatus.COMPLETED,
        score: 8,
        createdAt: new Date(),
      },
      {
        id: 2,
        status: EvaluationStatus.COMPLETED,
        score: 6,
        createdAt: new Date(),
      },
      {
        id: 3,
        status: EvaluationStatus.FAILED,
        score: null,
        createdAt: new Date(),
      },
      {
        id: 4,
        status: EvaluationStatus.PENDING,
        score: null,
        createdAt: new Date(),
      },
      {
        id: 5,
        status: EvaluationStatus.PROCESSING,
        score: null,
        createdAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockSubmissionRepository.findAndCount.mockResolvedValue([
        mockSubmissions,
        5,
      ]);
    });

    it('should generate daily stats correctly', async () => {
      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateDailyStats();

      expect(mockSubmissionRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          createdAt: expect.any(Object) as unknown, // LessThan object
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'daily stats generated:',
        expect.objectContaining({
          period: 'daily',
          totalSubmissions: 5,
          successfulEvaluations: 2,
          failedEvaluations: 1,
          pendingEvaluations: 2,
          averageScore: 7, // (8 + 6) / 2 = 7
        }),
      );

      consoleSpy.mockRestore();
    });

    it('should generate weekly stats correctly', async () => {
      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateWeeklyStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        'weekly stats generated:',
        expect.objectContaining({
          period: 'weekly',
          totalSubmissions: 5,
          successfulEvaluations: 2,
          failedEvaluations: 1,
          pendingEvaluations: 2,
          averageScore: 7,
        }),
      );

      consoleSpy.mockRestore();
    });

    it('should generate monthly stats correctly', async () => {
      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateMonthlyStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        'monthly stats generated:',
        expect.objectContaining({
          period: 'monthly',
          totalSubmissions: 5,
          successfulEvaluations: 2,
          failedEvaluations: 1,
          pendingEvaluations: 2,
          averageScore: 7,
        }),
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty submissions for stats', async () => {
      mockSubmissionRepository.findAndCount.mockResolvedValue([[], 0]);
      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateDailyStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        'daily stats generated:',
        expect.objectContaining({
          period: 'daily',
          totalSubmissions: 0,
          successfulEvaluations: 0,
          failedEvaluations: 0,
          pendingEvaluations: 0,
          averageScore: null,
        }),
      );

      consoleSpy.mockRestore();
    });

    it('should calculate average score correctly with various scenarios', async () => {
      const submissionsWithoutScores = [
        {
          id: 1,
          status: EvaluationStatus.FAILED,
          score: null,
          createdAt: new Date(),
        },
        {
          id: 2,
          status: EvaluationStatus.PENDING,
          score: null,
          createdAt: new Date(),
        },
      ];

      mockSubmissionRepository.findAndCount.mockResolvedValue([
        submissionsWithoutScores,
        2,
      ]);

      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateDailyStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        'daily stats generated:',
        expect.objectContaining({
          averageScore: null, // No completed submissions with scores
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('generateStatsManually', () => {
    beforeEach(() => {
      mockSubmissionRepository.findAndCount.mockResolvedValue([[], 0]);
    });

    it('should generate daily stats manually', async () => {
      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateStatsManually('daily');

      expect(consoleSpy).toHaveBeenCalledWith('Generating daily statistics');
      consoleSpy.mockRestore();
    });

    it('should generate weekly stats manually', async () => {
      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateStatsManually('weekly');

      expect(consoleSpy).toHaveBeenCalledWith('Generating weekly statistics');
      consoleSpy.mockRestore();
    });

    it('should generate monthly stats manually', async () => {
      const consoleSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateStatsManually('monthly');

      expect(consoleSpy).toHaveBeenCalledWith('Generating monthly statistics');
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle database errors in autoRetryFailedSubmissions', async () => {
      const error = new Error('Database connection failed');
      mockSubmissionRepository.find.mockRejectedValue(error);
      const errorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      await service.autoRetryFailedSubmissions();

      expect(errorSpy).toHaveBeenCalledWith(
        'Auto-retry job failed:',
        'Database connection failed',
      );
      errorSpy.mockRestore();
    });

    it('should handle database errors in generateStats', async () => {
      const error = new Error('Database query failed');
      mockSubmissionRepository.findAndCount.mockRejectedValue(error);
      const errorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      await service.generateDailyStats();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to generate daily statistics:',
        error,
      );
      errorSpy.mockRestore();
    });
  });
});
