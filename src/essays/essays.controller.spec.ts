import { Test, TestingModule } from '@nestjs/testing';
import { EssaysController } from './essays.controller';
import { EssaysService } from './essays.service';
import { SubmitEssayDto } from './dto/submit-essay.dto';
import { ComponentType, EvaluationStatus } from './entities/essay.entity';
import {
  SubmitEssayResponseDto,
  EssayResponseDto,
} from './dto/essay-response.dto';
import { Request } from 'express';

describe('EssaysController', () => {
  let controller: EssaysController;

  const mockEssaysService = {
    submitEssay: jest.fn(),
    getEssay: jest.fn(),
    getStudentEssays: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EssaysController],
      providers: [
        {
          provide: EssaysService,
          useValue: mockEssaysService,
        },
      ],
    }).compile();

    controller = module.get<EssaysController>(EssaysController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitEssay', () => {
    const mockRequest = {
      user: { sub: 1 },
    } as Request & { user: { sub: number } };

    const submitEssayDto: SubmitEssayDto = {
      title: '테스트 에세이',
      submitText: '테스트 내용',
      componentType: ComponentType.WRITING,
    };

    const mockSubmitResult: SubmitEssayResponseDto = {
      essayId: 1,
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

    it('should submit essay successfully', async () => {
      mockEssaysService.submitEssay.mockResolvedValue(mockSubmitResult);

      const result = await controller.submitEssay(mockRequest, submitEssayDto);

      expect(mockEssaysService.submitEssay).toHaveBeenCalledWith(
        1,
        submitEssayDto,
        undefined,
      );
      expect(result).toEqual({
        result: 'ok',
        message: '에세이가 성공적으로 제출되었습니다.',
        data: mockSubmitResult,
      });
    });

    it('should submit essay with video file', async () => {
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

      mockEssaysService.submitEssay.mockResolvedValue(mockResultWithVideo);

      const result = await controller.submitEssay(
        mockRequest,
        submitEssayDto,
        mockVideoFile,
      );

      expect(mockEssaysService.submitEssay).toHaveBeenCalledWith(
        1,
        submitEssayDto,
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

      const result = await controller.submitEssay(
        requestWithoutUser,
        submitEssayDto,
      );

      expect(result).toEqual({
        result: 'failed',
        message: '인증이 필요합니다.',
      });
      expect(mockEssaysService.submitEssay).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      const error = new Error('에세이 제출 실패');
      mockEssaysService.submitEssay.mockRejectedValue(error);

      const result = await controller.submitEssay(mockRequest, submitEssayDto);

      expect(result).toEqual({
        result: 'failed',
        message: '에세이 제출 실패',
      });
    });

    it('should handle unknown error', async () => {
      mockEssaysService.submitEssay.mockRejectedValue('unknown error');

      const result = await controller.submitEssay(mockRequest, submitEssayDto);

      expect(result).toEqual({
        result: 'failed',
        message: '에세이 제출에 실패했습니다.',
      });
    });
  });

  describe('getEssay', () => {
    const mockRequest = {
      user: { sub: 1 },
    } as Request & { user: { sub: number } };

    const mockEssayResponse: EssayResponseDto = {
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

    it('should get essay successfully', async () => {
      mockEssaysService.getEssay.mockResolvedValue(mockEssayResponse);

      const result = await controller.getEssay(mockRequest, 1);

      expect(mockEssaysService.getEssay).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({
        result: 'ok',
        message: '에세이 조회에 성공했습니다.',
        data: mockEssayResponse,
      });
    });

    it('should return authentication error when no user', async () => {
      const requestWithoutUser = {} as Request;

      const result = await controller.getEssay(requestWithoutUser, 1);

      expect(result).toEqual({
        result: 'failed',
        message: '인증이 필요합니다.',
      });
      expect(mockEssaysService.getEssay).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      const error = new Error('에세이를 찾을 수 없습니다');
      mockEssaysService.getEssay.mockRejectedValue(error);

      const result = await controller.getEssay(mockRequest, 1);

      expect(result).toEqual({
        result: 'failed',
        message: '에세이를 찾을 수 없습니다',
      });
    });

    it('should handle unknown error', async () => {
      mockEssaysService.getEssay.mockRejectedValue('unknown error');

      const result = await controller.getEssay(mockRequest, 1);

      expect(result).toEqual({
        result: 'failed',
        message: '에세이 조회에 실패했습니다.',
      });
    });
  });

  describe('getStudentEssays', () => {
    const mockRequest = {
      user: { sub: 1 },
    } as Request & { user: { sub: number } };

    const mockEssaysList: EssayResponseDto[] = [
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

    it('should get student essays successfully', async () => {
      mockEssaysService.getStudentEssays.mockResolvedValue(mockEssaysList);

      const result = await controller.getStudentEssays(mockRequest);

      expect(mockEssaysService.getStudentEssays).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        result: 'ok',
        message: '에세이 목록 조회에 성공했습니다.',
        data: mockEssaysList,
      });
    });

    it('should return empty array when no essays', async () => {
      mockEssaysService.getStudentEssays.mockResolvedValue([]);

      const result = await controller.getStudentEssays(mockRequest);

      expect(result).toEqual({
        result: 'ok',
        message: '에세이 목록 조회에 성공했습니다.',
        data: [],
      });
    });

    it('should return authentication error when no user', async () => {
      const requestWithoutUser = {} as Request;

      const result = await controller.getStudentEssays(requestWithoutUser);

      expect(result).toEqual({
        result: 'failed',
        message: '인증이 필요합니다.',
      });
      expect(mockEssaysService.getStudentEssays).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      const error = new Error('목록 조회 실패');
      mockEssaysService.getStudentEssays.mockRejectedValue(error);

      const result = await controller.getStudentEssays(mockRequest);

      expect(result).toEqual({
        result: 'failed',
        message: '목록 조회 실패',
      });
    });

    it('should handle unknown error', async () => {
      mockEssaysService.getStudentEssays.mockRejectedValue('unknown error');

      const result = await controller.getStudentEssays(mockRequest);

      expect(result).toEqual({
        result: 'failed',
        message: '에세이 목록 조회에 실패했습니다.',
      });
    });
  });
});
