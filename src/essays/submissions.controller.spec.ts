import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { EvaluationStatus } from './entities/submission.entity';
import { ComponentType } from './enums/component-type.enum';
import {
  SubmitSubmissionResponseDto,
  SubmissionResponseDto,
} from './dto/submission-response.dto';
import { Request } from 'express';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;

  const mockSubmissionsService = {
    submitSubmission: jest.fn(),
    getSubmission: jest.fn(),
    getStudentSubmissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        {
          provide: SubmissionsService,
          useValue: mockSubmissionsService,
        },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitSubmission', () => {
    const mockRequest = {
      user: { sub: 1 },
    } as Request & { user: { sub: number } };

    const submitSubmissionDto: SubmitSubmissionDto = {
      title: '테스트 에세이',
      submitText: '테스트 내용',
      componentType: ComponentType.WRITING,
    };

    const mockSubmitResult: SubmitSubmissionResponseDto = {
      submissionId: 1,
      studentId: 1,
      studentName: '테스트학생',
      status: EvaluationStatus.COMPLETED,
      message: null,
      score: 85,
      feedback: '좋은 에세이입니다.',
      highlights: ['좋은', '에세이'],
      submitText: '테스트 내용',
      highlightSubmitText: '테스트 내용 <mark>좋은</mark> <mark>에세이</mark>',
      apiLatency: 1000,
    };

    it('should submit submission successfully', async () => {
      mockSubmissionsService.submitSubmission.mockResolvedValue(
        mockSubmitResult,
      );

      const result = await controller.submitSubmission(
        mockRequest,
        submitSubmissionDto,
      );

      expect(mockSubmissionsService.submitSubmission).toHaveBeenCalledWith(
        1,
        submitSubmissionDto,
        undefined,
      );
      expect(result).toEqual({
        result: 'ok',
        message: '에세이가 성공적으로 제출되었습니다.',
        data: mockSubmitResult,
      });
    });

    it('should submit submission with video file', async () => {
      const mockVideoFile = {
        buffer: Buffer.from('fake video'),
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      const mockResultWithVideo = {
        ...mockSubmitResult,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.wav',
      };

      mockSubmissionsService.submitSubmission.mockResolvedValue(
        mockResultWithVideo,
      );

      const result = await controller.submitSubmission(
        mockRequest,
        submitSubmissionDto,
        mockVideoFile,
      );

      expect(mockSubmissionsService.submitSubmission).toHaveBeenCalledWith(
        1,
        submitSubmissionDto,
        mockVideoFile,
      );
      expect(result).toEqual({
        result: 'ok',
        message: '에세이가 성공적으로 제출되었습니다.',
        data: mockResultWithVideo,
      });
    });

    it('should return authentication error when no user', async () => {
      const requestWithoutUser = {} as Request;

      const result = await controller.submitSubmission(
        requestWithoutUser,
        submitSubmissionDto,
      );

      expect(result).toEqual({
        result: 'failed',
        message: '인증이 필요합니다.',
      });
      expect(mockSubmissionsService.submitSubmission).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      const error = new Error('에세이 제출 실패');
      mockSubmissionsService.submitSubmission.mockRejectedValue(error);

      const result = await controller.submitSubmission(
        mockRequest,
        submitSubmissionDto,
      );

      expect(result).toEqual({
        result: 'failed',
        message: '에세이 제출 실패',
      });
    });

    it('should handle unknown error', async () => {
      mockSubmissionsService.submitSubmission.mockRejectedValue(
        'unknown error',
      );

      const result = await controller.submitSubmission(
        mockRequest,
        submitSubmissionDto,
      );

      expect(result).toEqual({
        result: 'failed',
        message: '에세이 제출에 실패했습니다.',
      });
    });
  });

  describe('getSubmission', () => {
    const mockRequest = {
      user: { sub: 1 },
    } as Request & { user: { sub: number } };

    const mockSubmissionResponse: SubmissionResponseDto = {
      id: 1,
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

    it('should get submission successfully', async () => {
      mockSubmissionsService.getSubmission.mockResolvedValue(
        mockSubmissionResponse,
      );

      const result = await controller.getSubmission(mockRequest, 1);

      expect(mockSubmissionsService.getSubmission).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({
        result: 'ok',
        message: '제출물 조회에 성공했습니다.',
        data: mockSubmissionResponse,
      });
    });

    it('should return authentication error when no user', async () => {
      const requestWithoutUser = {} as Request;

      const result = await controller.getSubmission(requestWithoutUser, 1);

      expect(result).toEqual({
        result: 'failed',
        message: '인증이 필요합니다.',
      });
      expect(mockSubmissionsService.getSubmission).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      const error = new Error('제출물을 찾을 수 없습니다');
      mockSubmissionsService.getSubmission.mockRejectedValue(error);

      const result = await controller.getSubmission(mockRequest, 1);

      expect(result).toEqual({
        result: 'failed',
        message: '제출물을 찾을 수 없습니다',
      });
    });

    it('should handle unknown error', async () => {
      mockSubmissionsService.getSubmission.mockRejectedValue('unknown error');

      const result = await controller.getSubmission(mockRequest, 1);

      expect(result).toEqual({
        result: 'failed',
        message: '제출물 조회에 실패했습니다.',
      });
    });
  });

  describe('getStudentSubmissions', () => {
    const mockRequest = {
      user: { sub: 1 },
    } as Request & { user: { sub: number } };

    const mockSubmissionsList: SubmissionResponseDto[] = [
      {
        id: 1,
        title: '첫 번째 에세이',
        submitText: '첫 번째 내용',
        componentType: ComponentType.WRITING,
        status: EvaluationStatus.COMPLETED,
        score: 85,
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

    it('should get student submissions successfully', async () => {
      mockSubmissionsService.getStudentSubmissions.mockResolvedValue(
        mockSubmissionsList,
      );

      const result = await controller.getStudentSubmissions(mockRequest);

      expect(mockSubmissionsService.getStudentSubmissions).toHaveBeenCalledWith(
        1,
      );
      expect(result).toEqual({
        result: 'ok',
        message: '제출물 목록 조회에 성공했습니다.',
        data: mockSubmissionsList,
      });
    });

    it('should return empty array when no submissions', async () => {
      mockSubmissionsService.getStudentSubmissions.mockResolvedValue([]);

      const result = await controller.getStudentSubmissions(mockRequest);

      expect(result).toEqual({
        result: 'ok',
        message: '제출물 목록 조회에 성공했습니다.',
        data: [],
      });
    });

    it('should return authentication error when no user', async () => {
      const requestWithoutUser = {} as Request;

      const result = await controller.getStudentSubmissions(requestWithoutUser);

      expect(result).toEqual({
        result: 'failed',
        message: '인증이 필요합니다.',
      });
      expect(
        mockSubmissionsService.getStudentSubmissions,
      ).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      const error = new Error('목록 조회 실패');
      mockSubmissionsService.getStudentSubmissions.mockRejectedValue(error);

      const result = await controller.getStudentSubmissions(mockRequest);

      expect(result).toEqual({
        result: 'failed',
        message: '목록 조회 실패',
      });
    });

    it('should handle unknown error', async () => {
      mockSubmissionsService.getStudentSubmissions.mockRejectedValue(
        'unknown error',
      );

      const result = await controller.getStudentSubmissions(mockRequest);

      expect(result).toEqual({
        result: 'failed',
        message: '제출물 목록 조회에 실패했습니다.',
      });
    });
  });
});
