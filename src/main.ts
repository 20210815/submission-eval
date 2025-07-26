import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
      skipMissingProperties: false,

      exceptionFactory: (errors) => {
        const messages = errors
          .map((e) => Object.values(e.constraints || {}))
          .flat();
        return new BadRequestException(
          messages.length === 1 ? messages[0] : messages,
        );
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('제출물 및 평가 API')
    .setDescription(
      `
      학생 제출물 및 AI 기반 평가 시스템 API입니다.
      
      ## 최근 보안 및 안정성 개선사항 (2025-01-24)
      
      ### 🔒 보안 강화
      - **비밀번호 정책**: 최소 8자 이상, 복잡도 요구사항 (대소문자, 숫자, 특수문자)
      - **JWT 검증**: 토큰 만료 확인 추가 및 필드 쿼리 최적화
      
      ### 📝 입력 검증
      - **제출물 텍스트 제한**: 10-10,000자 제한 적용
      - **파일 업로드**: 적절한 HTTP 상태 코드와 함께 검증 개선
      
      ### 🛡️ 시스템 안정성  
      - **데이터베이스 안전성**: 프로덕션 동기화 비활성화
      - **트랜잭션 관리**: 제출물 처리를 트랜잭션으로 감싸기
      - **테스트 인프라**: 테스트 정리 시 FK 제약 조건 처리 수정
      
      ### 📋 API 표준
      - 모든 엔드포인트에서 표준화된 응답 형식 사용
      - 의미 있는 메시지와 함께 적절한 오류 처리
      - 보호된 라우트에는 Bearer 토큰 인증 필요
    `,
    )
    .setVersion('1.1.0')
    .addBearerAuth()
    .addTag('Authentication', '사용자 회원가입, 로그인 및 JWT 토큰 관리')
    .addTag('Submissions', '제출물 작성, 조회 및 AI 평가')
    .addTag('Statistics', '통계 데이터 조회')
    .addTag('Health', '시스템 상태 모니터링')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
