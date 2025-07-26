import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { StatsDaily } from '../src/stats/entities/stats-daily.entity';
import { StatsWeekly } from '../src/stats/entities/stats-weekly.entity';
import { StatsMonthly } from '../src/stats/entities/stats-monthly.entity';
import { JwtService } from '@nestjs/jwt';
import { Student } from '../src/students/entities/student.entity';

describe('StatsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = moduleRef.get(DataSource);

    const studentRepo = dataSource.getRepository(Student);
    const existing = await studentRepo.findOne({
      where: { email: 'test@example.com' },
    });
    const student =
      existing ??
      (await studentRepo.save(
        studentRepo.create({
          name: '테스트유저',
          email: 'test@example.com',
          password: 'hashed_password',
        }),
      ));

    await studentRepo.save(student);

    const jwtService = moduleRef.get(JwtService);
    jwtToken = jwtService.sign({ sub: student.id });
  });

  afterEach(async () => {
    await dataSource.getRepository(StatsDaily).clear();
    await dataSource.getRepository(StatsWeekly).clear();
    await dataSource.getRepository(StatsMonthly).clear();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('GET /v1/stats/daily - should return daily stats', async () => {
    const statsDailyRepo = dataSource.getRepository(StatsDaily);
    await statsDailyRepo.insert({
      date: '2025-01-15',
      totalCount: 100,
      successCount: 80,
      failCount: 20,
    });

    const res = await request(app.getHttpServer())
      .get('/v1/stats/daily')
      .set('Authorization', `Bearer ${jwtToken}`)
      .query({ day: '2025-01-15' })
      .expect(200);

    expect(res.body).toEqual({
      date: '2025-01-15',
      totalCount: 100,
      successCount: 80,
      failCount: 20,
      successRate: 80.0,
    });
  });

  it('GET /v1/stats/weekly - should return weekly stats', async () => {
    const statsWeeklyRepo = dataSource.getRepository(StatsWeekly);
    await statsWeeklyRepo.insert({
      weekStart: '2025-01-08',
      weekEnd: '2025-01-14',
      totalCount: 120,
      successCount: 100,
      failCount: 20,
    });

    const res = await request(app.getHttpServer())
      .get('/v1/stats/weekly')
      .set('Authorization', `Bearer ${jwtToken}`)
      .query({
        weekStart: '2025-01-08',
        weekEnd: '2025-01-14',
      })
      .expect(200);

    expect(res.body).toEqual([
      {
        weekStart: '2025-01-08',
        weekEnd: '2025-01-14',
        totalCount: 120,
        successCount: 100,
        failCount: 20,
        successRate: 83.3,
      },
    ]);
  });

  it('GET /v1/stats/monthly - should return monthly stats', async () => {
    const statsMonthlyRepo = dataSource.getRepository(StatsMonthly);
    await statsMonthlyRepo.insert({
      month: '2025-01',
      totalCount: 150,
      successCount: 120,
      failCount: 30,
    });

    const res = await request(app.getHttpServer())
      .get('/v1/stats/monthly')
      .set('Authorization', `Bearer ${jwtToken}`)
      .query({ month: '2025-01' })
      .expect(200);

    expect(res.body).toEqual({
      month: '2025-01',
      totalCount: 150,
      successCount: 120,
      failCount: 30,
      successRate: 80.0,
    });
  });
});
