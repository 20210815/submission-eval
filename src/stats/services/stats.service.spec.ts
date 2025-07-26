import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatsService } from './stats.service';
import { StatsDaily } from '../entities/stats-daily.entity';
import { StatsWeekly } from '../entities/stats-weekly.entity';
import { StatsMonthly } from '../entities/stats-monthly.entity';
import { Submission } from '../../essays/entities/submission.entity';

describe('StatsService', () => {
  let service: StatsService;
  let statsDailyRepository: Repository<StatsDaily>;
  let submissionRepository: Repository<Submission>;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
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
        {
          provide: getRepositoryToken(Submission),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    statsDailyRepository = module.get<Repository<StatsDaily>>(
      getRepositoryToken(StatsDaily),
    );
    submissionRepository = module.get<Repository<Submission>>(
      getRepositoryToken(Submission),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('collectDailyStats', () => {
    it('should collect daily stats for a given date', async () => {
      const testDate = '2025-01-15';
      const mockStats = {
        total_count: '10',
        success_count: '8',
        fail_count: '2',
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      };

      jest.spyOn(statsDailyRepository, 'findOne').mockResolvedValue(null);

      jest
        .spyOn(submissionRepository, 'createQueryBuilder')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(statsDailyRepository, 'create').mockReturnValue({
        date: testDate,
        totalCount: 10,
        successCount: 8,
        failCount: 2,
      } as StatsDaily);
      const saveSpy = jest
        .spyOn(statsDailyRepository, 'save')
        .mockResolvedValue({
          id: 1,
          date: testDate,
          totalCount: 10,
          successCount: 8,
          failCount: 2,
        } as StatsDaily);

      const result = await service.collectDailyStats(testDate);

      expect(result).toEqual({
        id: 1,
        date: testDate,
        totalCount: 10,
        successCount: 8,
        failCount: 2,
      });
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('manual collection methods', () => {
    it('should allow manual daily stats collection', async () => {
      const testDate = '2025-01-15';
      const mockCollectDailyStats = jest
        .spyOn(service, 'collectDailyStats')
        .mockImplementation(() =>
          Promise.resolve({
            id: 1,
            date: testDate,
            totalCount: 10,
            successCount: 8,
            failCount: 2,
          } as StatsDaily),
        );

      const result = await service.manualCollectDailyStats(testDate);

      expect(mockCollectDailyStats).toHaveBeenCalledWith(testDate);
      expect(result.date).toBe(testDate);
    });
  });
});
