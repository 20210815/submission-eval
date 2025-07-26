import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RevisionController } from './revision.controller';
import { RevisionService } from '../services/revision.service';
import { CreateRevisionDto, RevisionResponseDto } from '../dto/revision.dto';
import { RevisionStatus } from '../entities/revision.entity';
import { ComponentType } from '../enums/component-type.enum';

describe('RevisionController', () => {
  let controller: RevisionController;

  const mockRevisionService = {
    createRevision: jest.fn(),
    getRevisions: jest.fn(),
    getRevisionById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RevisionController],
      providers: [
        {
          provide: RevisionService,
          useValue: mockRevisionService,
        },
      ],
    }).compile();

    controller = module.get<RevisionController>(RevisionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRevision', () => {
    const createRevisionDto: CreateRevisionDto = {
      submissionId: '1',
    };

    const mockRevisionResponse: RevisionResponseDto = {
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
    };

    it('should create revision successfully', async () => {
      mockRevisionService.createRevision.mockResolvedValue(
        mockRevisionResponse,
      );

      const result = await controller.createRevision(createRevisionDto);

      expect(result).toEqual(mockRevisionResponse);
      expect(mockRevisionService.createRevision).toHaveBeenCalledWith(
        createRevisionDto,
      );
      expect(mockRevisionService.createRevision).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when submission not found', async () => {
      mockRevisionService.createRevision.mockRejectedValue(
        new NotFoundException('제출물을 찾을 수 없습니다.'),
      );

      await expect(
        controller.createRevision(createRevisionDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.createRevision(createRevisionDto),
      ).rejects.toThrow('제출물을 찾을 수 없습니다.');

      expect(mockRevisionService.createRevision).toHaveBeenCalledWith(
        createRevisionDto,
      );
    });

    it('should throw ConflictException when revision already in progress', async () => {
      mockRevisionService.createRevision.mockRejectedValue(
        new ConflictException('이미 진행 중인 재평가가 있습니다.'),
      );

      await expect(
        controller.createRevision(createRevisionDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        controller.createRevision(createRevisionDto),
      ).rejects.toThrow('이미 진행 중인 재평가가 있습니다.');

      expect(mockRevisionService.createRevision).toHaveBeenCalledWith(
        createRevisionDto,
      );
    });

    it('should throw NotFoundException for invalid submission ID format', async () => {
      const invalidDto = { submissionId: 'invalid' };
      mockRevisionService.createRevision.mockRejectedValue(
        new NotFoundException('유효하지 않은 submission ID입니다.'),
      );

      await expect(controller.createRevision(invalidDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.createRevision(invalidDto)).rejects.toThrow(
        '유효하지 않은 submission ID입니다.',
      );

      expect(mockRevisionService.createRevision).toHaveBeenCalledWith(
        invalidDto,
      );
    });
  });

  describe('getRevisions', () => {
    const mockRevisionsList = {
      data: [
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
          revisionReason: undefined,
          errorMessage: undefined,
          apiLatency: 1500,
          traceId: 'trace-123',
        },
        {
          id: 2,
          submissionId: 2,
          studentId: 124,
          componentType: ComponentType.SPEAKING,
          status: RevisionStatus.PENDING,
          revisionReason: undefined,
          score: undefined,
          feedback: undefined,
          highlights: undefined,
          highlightSubmitText: undefined,
          errorMessage: undefined,
          apiLatency: undefined,
          traceId: undefined,
        },
      ] as RevisionResponseDto[],
      total: 2,
      totalPages: 1,
    };

    it('should get revisions with default parameters', async () => {
      mockRevisionService.getRevisions.mockResolvedValue(mockRevisionsList);

      const result = await controller.getRevisions(1, 20, 'createdAt,DESC');

      expect(result).toEqual(mockRevisionsList);
      expect(mockRevisionService.getRevisions).toHaveBeenCalledWith(
        1,
        20,
        'createdAt,DESC',
      );
      expect(mockRevisionService.getRevisions).toHaveBeenCalledTimes(1);
    });

    it('should get revisions with custom parameters', async () => {
      mockRevisionService.getRevisions.mockResolvedValue({
        data: [mockRevisionsList.data[0]],
        total: 1,
        totalPages: 1,
      });

      const result = await controller.getRevisions(2, 10, 'id,ASC');

      expect(result).toEqual({
        data: [mockRevisionsList.data[0]],
        total: 1,
        totalPages: 1,
      });
      expect(mockRevisionService.getRevisions).toHaveBeenCalledWith(
        2,
        10,
        'id,ASC',
      );
    });

    it('should handle empty results', async () => {
      mockRevisionService.getRevisions.mockResolvedValue({
        data: [],
        total: 0,
        totalPages: 0,
      });

      const result = await controller.getRevisions(1, 20, 'createdAt,DESC');

      expect(result).toEqual({
        data: [],
        total: 0,
        totalPages: 0,
      });
      expect(mockRevisionService.getRevisions).toHaveBeenCalledWith(
        1,
        20,
        'createdAt,DESC',
      );
    });
  });

  describe('getRevisionById', () => {
    const mockRevision: RevisionResponseDto = {
      id: 1,
      submissionId: 1,
      studentId: 123,
      componentType: ComponentType.WRITING,
      status: RevisionStatus.COMPLETED,
      revisionReason: 'Initial evaluation failed',
      score: 8,
      feedback: 'Great improvement in grammar and structure.',
      highlights: ['great improvement', 'good structure'],
      highlightSubmitText:
        'This shows <b>great improvement</b> with <b>good structure</b>.',
      errorMessage: undefined,
      apiLatency: 1432,
      traceId: 'trace-12345-67890',
    };

    it('should get revision by ID successfully', async () => {
      mockRevisionService.getRevisionById.mockResolvedValue(mockRevision);

      const result = await controller.getRevisionById(1);

      expect(result).toEqual(mockRevision);
      expect(mockRevisionService.getRevisionById).toHaveBeenCalledWith(1);
      expect(mockRevisionService.getRevisionById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when revision not found', async () => {
      mockRevisionService.getRevisionById.mockRejectedValue(
        new NotFoundException('재평가를 찾을 수 없습니다.'),
      );

      await expect(controller.getRevisionById(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getRevisionById(999)).rejects.toThrow(
        '재평가를 찾을 수 없습니다.',
      );

      expect(mockRevisionService.getRevisionById).toHaveBeenCalledWith(999);
    });

    it('should handle invalid revision ID format gracefully', async () => {
      // This would be handled by ParseIntPipe in the actual controller
      // but we can test the service call with valid number
      mockRevisionService.getRevisionById.mockRejectedValue(
        new NotFoundException('재평가를 찾을 수 없습니다.'),
      );

      await expect(controller.getRevisionById(-1)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRevisionService.getRevisionById).toHaveBeenCalledWith(-1);
    });
  });

  describe('service integration', () => {
    it('should properly delegate all calls to service', async () => {
      const createDto: CreateRevisionDto = { submissionId: '1' };
      const mockResponse: RevisionResponseDto = {
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
      };

      mockRevisionService.createRevision.mockResolvedValue(mockResponse);
      mockRevisionService.getRevisions.mockResolvedValue({
        data: [mockResponse],
        total: 1,
        totalPages: 1,
      });
      mockRevisionService.getRevisionById.mockResolvedValue(mockResponse);

      // Test all methods
      await controller.createRevision(createDto);
      await controller.getRevisions(1, 20, 'createdAt,DESC');
      await controller.getRevisionById(1);

      // Verify all service methods were called
      expect(mockRevisionService.createRevision).toHaveBeenCalled();
      expect(mockRevisionService.getRevisions).toHaveBeenCalled();
      expect(mockRevisionService.getRevisionById).toHaveBeenCalled();
    });
  });
});
