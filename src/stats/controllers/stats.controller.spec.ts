import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from '../services/stats.service';
import { StatsDaily } from '../entities/stats-daily.entity';
import { StatsWeekly } from '../entities/stats-weekly.entity';
import { StatsMonthly } from '../entities/stats-monthly.entity';
import {
  GetDailyStatsDto,
  GetWeeklyStatsDto,
  GetMonthlyStatsDto,
} from '../dto/stats.dto';

describe('StatsController', () => {
  let controller: StatsController;
  let statsDailyRepository: Repository<StatsDaily>;
  let statsWeeklyRepository: Repository<StatsWeekly>;
  let statsMonthlyRepository: Repository<StatsMonthly>;

  const mockStatsService = {
    manualCollectDailyStats: jest.fn(),
    manualCollectWeeklyStats: jest.fn(),
    manualCollectMonthlyStats: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
        {
          provide: getRepositoryToken(StatsDaily),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(StatsWeekly),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(StatsMonthly),
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    statsDailyRepository = module.get<Repository<StatsDaily>>(
      getRepositoryToken(StatsDaily),
    );
    statsWeeklyRepository = module.get<Repository<StatsWeekly>>(
      getRepositoryToken(StatsWeekly),
    );
    statsMonthlyRepository = module.get<Repository<StatsMonthly>>(
      getRepositoryToken(StatsMonthly),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDailyStats', () => {
    const mockQuery: GetDailyStatsDto = {
      day: '2025-01-15',
    };

    const mockDailyStat = {
      date: '2025-01-15',
      totalCount: 100,
      successCount: 80,
      failCount: 20,
    };

    it('should return daily stats when data exists', async () => {
      jest
        .spyOn(statsDailyRepository, 'findOne')
        .mockResolvedValue(mockDailyStat as StatsDaily);

      const result = await controller.getDailyStats(mockQuery);

      expect(result).toEqual({
        date: '2025-01-15',
        totalCount: 100,
        successCount: 80,
        failCount: 20,
        successRate: 80.0,
      });
      expect(
        statsDailyRepository.findOne.bind(statsDailyRepository),
      ).toHaveBeenCalledWith({ where: { date: '2025-01-15' } });
    });

    it('should return zero stats when no data exists', async () => {
      jest.spyOn(statsDailyRepository, 'findOne').mockResolvedValue(null);

      const result = await controller.getDailyStats(mockQuery);

      expect(result).toEqual({
        date: '2025-01-15',
        totalCount: 0,
        successCount: 0,
        failCount: 0,
        successRate: 0,
      });
    });

    it('should throw BadRequestException for future date', async () => {
      const futureQuery: GetDailyStatsDto = {
        day: '2025-12-31',
      };

      await expect(controller.getDailyStats(futureQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getDailyStats(futureQuery)).rejects.toThrow(
        '미래 날짜의 통계는 조회할 수 없습니다.',
      );
    });

    it('should handle repository errors', async () => {
      jest
        .spyOn(statsDailyRepository, 'findOne')
        .mockRejectedValue(new Error('DB Error'));

      await expect(controller.getDailyStats(mockQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getDailyStats(mockQuery)).rejects.toThrow(
        '일일 통계 조회 중 오류가 발생했습니다.',
      );
    });
  });

  describe('getWeeklyStats', () => {
    const mockQuery: GetWeeklyStatsDto = {
      weekStart: '2025-01-13',
      weekEnd: '2025-01-19',
    };

    const mockWeeklyStats = [
      {
        weekStart: '2025-01-13',
        weekEnd: '2025-01-19',
        totalCount: 150,
        successCount: 120,
        failCount: 30,
      },
    ];

    it('should return weekly stats when data exists', async () => {
      jest
        .spyOn(statsWeeklyRepository, 'find')
        .mockResolvedValue(mockWeeklyStats as StatsWeekly[]);

      const result = await controller.getWeeklyStats(mockQuery);

      expect(result).toEqual([
        {
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          totalCount: 150,
          successCount: 120,
          failCount: 30,
          successRate: 80.0,
        },
      ]);
      expect(
        statsWeeklyRepository.find.bind(statsWeeklyRepository),
      ).toHaveBeenCalledWith({
        where: { weekStart: Between('2025-01-13', '2025-01-19') },
        order: { weekStart: 'ASC' },
      });
    });

    it('should return empty array when no data exists', async () => {
      jest.spyOn(statsWeeklyRepository, 'find').mockResolvedValue([]);

      const result = await controller.getWeeklyStats(mockQuery);

      expect(result).toEqual([]);
    });

    it('should throw BadRequestException for future weekStart', async () => {
      const futureQuery: GetWeeklyStatsDto = {
        weekStart: '2025-12-30',
        weekEnd: '2025-12-31',
      };

      await expect(controller.getWeeklyStats(futureQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getWeeklyStats(futureQuery)).rejects.toThrow(
        '미래 시작 날짜의 통계는 조회할 수 없습니다.',
      );
    });

    it('should throw BadRequestException for future weekEnd', async () => {
      const futureQuery: GetWeeklyStatsDto = {
        weekStart: '2025-01-13',
        weekEnd: '2025-12-31',
      };

      await expect(controller.getWeeklyStats(futureQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getWeeklyStats(futureQuery)).rejects.toThrow(
        '미래 종료 날짜의 통계는 조회할 수 없습니다.',
      );
    });

    it('should throw BadRequestException for invalid date order', async () => {
      const invalidQuery: GetWeeklyStatsDto = {
        weekStart: '2025-01-19',
        weekEnd: '2025-01-13',
      };

      await expect(controller.getWeeklyStats(invalidQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getWeeklyStats(invalidQuery)).rejects.toThrow(
        '시작 날짜는 종료 날짜보다 이전이어야 합니다.',
      );
    });

    it('should handle repository errors', async () => {
      jest
        .spyOn(statsWeeklyRepository, 'find')
        .mockRejectedValue(new Error('DB Error'));

      await expect(controller.getWeeklyStats(mockQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getWeeklyStats(mockQuery)).rejects.toThrow(
        '주간 통계 조회 중 오류가 발생했습니다.',
      );
    });
  });

  describe('getMonthlyStats', () => {
    const mockQuery: GetMonthlyStatsDto = {
      month: '2025-01',
    };

    const mockMonthlyStat = {
      month: '2025-01',
      totalCount: 500,
      successCount: 400,
      failCount: 100,
    };

    it('should return monthly stats when data exists', async () => {
      jest
        .spyOn(statsMonthlyRepository, 'findOne')
        .mockResolvedValue(mockMonthlyStat as StatsMonthly);

      const result = await controller.getMonthlyStats(mockQuery);

      expect(result).toEqual({
        month: '2025-01',
        totalCount: 500,
        successCount: 400,
        failCount: 100,
        successRate: 80.0,
      });
      expect(
        statsMonthlyRepository.findOne.bind(statsMonthlyRepository),
      ).toHaveBeenCalledWith({
        where: { month: '2025-01' },
      });
    });

    it('should return zero stats when no data exists', async () => {
      jest.spyOn(statsMonthlyRepository, 'findOne').mockResolvedValue(null);

      const result = await controller.getMonthlyStats(mockQuery);

      expect(result).toEqual({
        month: '2025-01',
        totalCount: 0,
        successCount: 0,
        failCount: 0,
        successRate: 0,
      });
    });

    it('should throw BadRequestException for future month', async () => {
      const futureQuery: GetMonthlyStatsDto = {
        month: '2025-12',
      };

      await expect(controller.getMonthlyStats(futureQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getMonthlyStats(futureQuery)).rejects.toThrow(
        '미래 월의 통계는 조회할 수 없습니다.',
      );
    });

    it('should handle repository errors', async () => {
      jest
        .spyOn(statsMonthlyRepository, 'findOne')
        .mockRejectedValue(new Error('DB Error'));

      await expect(controller.getMonthlyStats(mockQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getMonthlyStats(mockQuery)).rejects.toThrow(
        '월간 통계 조회 중 오류가 발생했습니다.',
      );
    });
  });
});
