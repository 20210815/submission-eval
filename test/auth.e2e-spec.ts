/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/filters/http-exception.filter';
import { DataSource } from 'typeorm';
import { Student } from '../src/students/entities/student.entity';

// 응답 타입 정의
interface AuthSuccessResponse {
  result: 'ok';
  message: string;
  studentId: number;
}

interface AuthErrorResponse {
  result: 'error';
  message: string | string[];
}

describe('Auth Controller (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let httpServer: any;

  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    name: '테스트유저',
    studentNumber: '2021001234',
  };

  const invalidUser = {
    email: 'invalid-email',
    password: '123',
    name: '',
    studentNumber: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 실제 애플리케이션과 동일한 설정 적용
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    // 데이터베이스 연결 가져오기
    dataSource = app.get(DataSource);
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    if (dataSource) {
      await dataSource.getRepository(Student).delete({ email: testUser.email });
    }
    await app.close();
  });

  beforeEach(async () => {
    // 각 테스트 전에 테스트 유저 정리
    if (dataSource) {
      await dataSource.getRepository(Student).delete({ email: testUser.email });
    }
  });

  describe('POST /auth/signup', () => {
    it('should successfully register a new student', async () => {
      const response = await request(httpServer)
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      const body = response.body as AuthSuccessResponse;
      expect(body).toEqual({
        result: 'ok',
        message: '회원가입에 성공했습니다',
        studentId: expect.any(Number),
      });
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(httpServer)
        .post('/auth/signup')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);

      const body = response.body as AuthErrorResponse;
      expect(body).toEqual({
        result: 'error',
        message: ['이메일 형식이 올바르지 않습니다'],
      });
    });

    it('should return 400 for short password', async () => {
      const response = await request(httpServer)
        .post('/auth/signup')
        .send({
          ...testUser,
          password: '123',
        })
        .expect(400);

      const body = response.body as AuthErrorResponse;
      expect(body).toEqual({
        result: 'error',
        message: ['비밀번호는 최소 4글자 이상이어야 합니다.'],
      });
    });

    it('should return 400 for multiple validation errors', async () => {
      const response = await request(httpServer)
        .post('/auth/signup')
        .send(invalidUser)
        .expect(400);

      const body = response.body as AuthErrorResponse;
      expect(body.result).toBe('error');
      expect(Array.isArray(body.message)).toBe(true);
      if (Array.isArray(body.message)) {
        expect(body.message.length).toBeGreaterThan(1);
      } else {
        fail('Expected message to be an array');
      }
    });

    it('should return 409 for duplicate email', async () => {
      // 첫 번째 회원가입
      await request(httpServer).post('/auth/signup').send(testUser).expect(201);

      // 동일한 이메일로 두 번째 회원가입 시도
      const response = await request(httpServer)
        .post('/auth/signup')
        .send(testUser)
        .expect(409);

      const body = response.body as AuthErrorResponse;
      expect(body).toEqual({
        result: 'error',
        message: ['이미 존재하는 이메일입니다'],
      });
    });

    it('should return 400 for empty required fields', async () => {
      const response = await request(httpServer)
        .post('/auth/signup')
        .send({})
        .expect(400);

      const body = response.body as AuthErrorResponse;
      expect(body.result).toBe('error');
      expect(Array.isArray(body.message)).toBe(true);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // 각 로그인 테스트 전에 테스트 유저 생성
      await request(httpServer).post('/auth/signup').send(testUser);
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const body = response.body as AuthSuccessResponse;
      expect(body).toEqual({
        result: 'ok',
        message: '로그인에 성공했습니다',
        studentId: expect.any(Number),
      });

      // 쿠키가 설정되었는지 확인
      const cookiesHeader = response.headers['set-cookie'];
      const cookies = isStringArrayOrUndefined(cookiesHeader) ? cookiesHeader : undefined;
      expect(cookies).toBeDefined();
      expect(
        cookies?.some((cookie: string) => cookie.startsWith('token=')),
      ).toBe(true);
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);

      const body = response.body as AuthErrorResponse;
      expect(body).toEqual({
        result: 'error',
        message: ['사용자를 찾을 수 없습니다'],
      });
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      const body = response.body as AuthErrorResponse;
      expect(body).toEqual({
        result: 'error',
        message: ['비밀번호가 일치하지 않습니다'],
      });
    });

    it('should return 400 for invalid email format in login', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password,
        })
        .expect(400);

      const body = response.body as AuthErrorResponse;
      expect(body.result).toBe('error');
      expect(Array.isArray(body.message)).toBe(true);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({})
        .expect(400);

      const body = response.body as AuthErrorResponse;
      expect(body.result).toBe('error');
      expect(Array.isArray(body.message)).toBe(true);
    });

    it('should set httpOnly cookie with correct attributes', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      const tokenCookie = cookies?.find((cookie: string) =>
        cookie.startsWith('token='),
      );

      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
      expect(tokenCookie).toContain('SameSite=Strict');
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full signup and login flow', async () => {
      // 1. 회원가입
      const signupResponse = await request(httpServer)
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      const signupBody = signupResponse.body as AuthSuccessResponse;
      const studentId = signupBody.studentId;

      // 2. 로그인
      const loginResponse = await request(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const loginBody = loginResponse.body as AuthSuccessResponse;
      expect(loginBody.studentId).toBe(studentId);

      // 3. 쿠키 확인
      const cookies = loginResponse.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      expect(cookies).toBeDefined();
      expect(
        cookies?.some((cookie: string) => cookie.startsWith('token=')),
      ).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent signup attempts with same email', async () => {
      const promises = [
        request(httpServer).post('/auth/signup').send(testUser),
        request(httpServer).post('/auth/signup').send(testUser),
      ];

      const responses = await Promise.allSettled(promises);

      // 하나는 성공(201), 하나는 실패(409)해야 함
      const statusCodes = responses.map((result) =>
        result.status === 'fulfilled' ? result.value.status : 500,
      );

      expect(statusCodes).toContain(201);
      expect(statusCodes).toContain(409);
    });

    it('should handle very long input values', async () => {
      const longString = 'a'.repeat(1000);

      const response = await request(httpServer)
        .post('/auth/signup')
        .send({
          email: `${longString}@example.com`,
          password: longString,
          name: longString,
          studentNumber: longString,
        })
        .expect(400);

      const body = response.body as AuthErrorResponse;
      expect(body.result).toBe('error');
    });
  });
});
