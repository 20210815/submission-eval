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

      exceptionFactory: (errors) => {
        const messages = errors.map((e) => Object.values(e.constraints || {}));
        return new BadRequestException(
          messages.length === 1 ? messages[0] : messages,
        );
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Essay Submission & Evaluation API')
    .setDescription(
      `
      API for student essay submission and AI-powered evaluation system.
      
      ## Recent Security & Stability Improvements (2025-01-24)
      
      ### 🔒 Enhanced Security
      - **Password Policy**: Minimum 8 characters with complexity requirements (uppercase, lowercase, numbers, special characters)
      - **JWT Validation**: Added token expiration checking and optimized field querying
      
      ### 📝 Input Validation
      - **Essay Text Limits**: 10-10,000 characters enforced
      - **File Upload**: Improved validation with proper HTTP status codes
      
      ### 🛡️ System Stability  
      - **Database Safety**: Production synchronization disabled
      - **Transaction Management**: Essay submission wrapped in transactions
      - **Test Infrastructure**: Fixed FK constraint handling in test cleanup
      
      ### 📋 API Standards
      - All endpoints use standardized response format
      - Proper error handling with meaningful messages
      - Bearer token authentication required for protected routes
    `,
    )
    .setVersion('1.1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User signup, login, and JWT token management')
    .addTag('Essays', 'Essay submission, retrieval, and AI evaluation')
    .addTag('Health', 'System health monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
