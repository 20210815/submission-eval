import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { HealthModule } from './health/health.module';
import { SubmissionsModule } from './essays/submissions.module';
import { CacheCustomModule } from './cache/cache.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StatsModule } from './stats/stats.module';
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AuthModule,
    StudentsModule,
    HealthModule,
    SubmissionsModule,
    CacheCustomModule,
    SchedulerModule,
    StatsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity.{ts,js}'],
      synchronize: process.env.NODE_ENV !== 'production', // 프로덕션에서는 동기화 비활성화
      logging: process.env.NODE_ENV === 'development' ? true : ['error'], // 개발환경에서만 전체 로깅
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
