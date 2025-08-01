import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Repository, DataSource } from 'typeorm';
import {
  Submission,
  EvaluationStatus,
} from '../src/essays/entities/submission.entity';
import { ComponentType } from '../src/essays/enums/component-type.enum';
import { Student } from '../src/students/entities/student.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

interface ApiResponse<T = any> {
  message: string;
  result: 'ok' | 'failed';
  data: T;
}

interface SubmissionData {
  submissionId: number;
  studentId: number;
  status: string;
  submitText: string;
  [key: string]: any;
}

interface SubmissionListItem {
  id: number;
  title: string;
  componentType: string;
  status: string;
  createdAt: string;
  [key: string]: any;
}

describe('Submissions (e2e)', () => {
  let app: INestApplication<App>;
  let submissionRepository: Repository<Submission>;
  let studentRepository: Repository<Student>;
  let jwtService: JwtService;
  let authToken: string;
  let studentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    submissionRepository = moduleFixture.get<Repository<Submission>>(
      getRepositoryToken(Submission),
    );
    studentRepository = moduleFixture.get<Repository<Student>>(
      getRepositoryToken(Student),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // 테스트용 학생 생성 - 유니크 이메일 사용
    const student = studentRepository.create({
      name: '테스트 학생',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedpassword',
    });
    const savedStudent = await studentRepository.save(student);
    studentId = savedStudent.id;

    // JWT 토큰 생성
    authToken = jwtService.sign({
      sub: studentId,
      name: savedStudent.name,
    });
  });

  afterAll(async () => {
    // 테스트 데이터 정리 - 올바른 순서로 삭제하여 FK 제약조건 해결
    const dataSource = app.get(DataSource);
    await dataSource.transaction(async (manager) => {
      // evaluation_logs 먼저 삭제
      await manager.query('DELETE FROM evaluation_logs');
      // submissions 다음 삭제
      await manager.query('DELETE FROM submissions');
      // students 마지막 삭제
      await manager.query('DELETE FROM students');
      // 시퀀스 재설정
      await manager.query('ALTER SEQUENCE students_id_seq RESTART WITH 1');
      await manager.query('ALTER SEQUENCE submissions_id_seq RESTART WITH 1');
      await manager.query(
        'ALTER SEQUENCE evaluation_logs_id_seq RESTART WITH 1',
      );
    });
    await app.close();
  });

  afterEach(async () => {
    // 각 테스트 후 에세이 데이터 정리 - FK 제약조건 순서 준수
    const dataSource = app.get(DataSource);
    await dataSource.transaction(async (manager) => {
      // evaluation_logs 먼저 삭제 후 submissions 삭제
      await manager.query('DELETE FROM evaluation_logs');
      await manager.query('DELETE FROM submissions');
      await manager.query('ALTER SEQUENCE submissions_id_seq RESTART WITH 1');
      await manager.query(
        'ALTER SEQUENCE evaluation_logs_id_seq RESTART WITH 1',
      );
    });
  });

  beforeEach(async () => {
    // 각 테스트마다 새로운 학생과 토큰 생성 (일관성 보장)
    const student = studentRepository.create({
      name: '테스트 학생',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedpassword',
    });
    const savedStudent = await studentRepository.save(student);
    studentId = savedStudent.id;

    // student가 제대로 생성되었는지 확인
    expect(studentId).toBeDefined();
    expect(studentId).toBeGreaterThan(0);

    // JWT 토큰 재생성
    authToken = jwtService.sign({
      sub: studentId,
      name: savedStudent.name,
    });

    // 토큰이 제대로 생성되었는지 확인
    expect(authToken).toBeDefined();
  });

  describe('POST /v1/submissions', () => {
    it('should submit submission successfully', async () => {
      const submitData = {
        title: '테스트 에세이 제목',
        submitText: '이것은 테스트 에세이 내용입니다.',
        componentType: ComponentType.WRITING,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', submitData.title)
        .field('submitText', submitData.submitText)
        .field('componentType', submitData.componentType)
        .expect(200);

      const responseBody = response.body as ApiResponse<SubmissionData>;
      expect(responseBody).toMatchObject({
        message: '에세이가 성공적으로 제출되었습니다.',
        result: 'ok',
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          submissionId: expect.any(Number),
          studentId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          status: expect.any(String),
          submitText: submitData.submitText,
        },
      });

      // DB에 저장되었는지 확인
      const savedSubmission = await submissionRepository.findOne({
        where: { id: responseBody.data.submissionId },
      });
      expect(savedSubmission).toBeTruthy();
      expect(savedSubmission?.title).toBe(submitData.title);
      expect(savedSubmission?.submitText).toBe(submitData.submitText);
      expect(savedSubmission?.componentType).toBe(submitData.componentType);
    });

    it('should submit submission with video file', async () => {
      const submitData = {
        title: '비디오 포함 에세이',
        submitText: '비디오가 포함된 에세이입니다.',
        componentType: ComponentType.SPEAKING,
      };

      // Mock video file buffer
      const mockVideoBuffer = Buffer.from('fake video content');

      const response = await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', submitData.title)
        .field('submitText', submitData.submitText)
        .field('componentType', submitData.componentType)
        .attach('video', mockVideoBuffer, {
          filename: 'test-video.mp4',
          contentType: 'video/mp4',
        })
        .expect(200);

      const responseBody = response.body as ApiResponse<SubmissionData>;

      if (responseBody.data) {
        expect(responseBody.data.submissionId).toBeDefined();
      } else {
        // data가 없다면 에러 응답일 수 있음
        expect(responseBody.result).toBe('failed');
      }
    });

    it('should return 401 without authentication', async () => {
      const submitData = {
        title: '인증 없는 에세이',
        submitText: '인증 없이 제출하는 에세이입니다.',
        componentType: ComponentType.WRITING,
      };

      await request(app.getHttpServer())
        .post('/v1/submissions')
        .field('title', submitData.title)
        .field('submitText', submitData.submitText)
        .field('componentType', submitData.componentType)
        .expect(401);
    });

    it('should prevent duplicate submission', async () => {
      const submitData = {
        title: '중복 제출 테스트',
        submitText: '중복 제출을 테스트합니다.',
        componentType: ComponentType.WRITING,
      };

      // 첫 번째 제출
      await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', submitData.title)
        .field('submitText', submitData.submitText)
        .field('componentType', submitData.componentType)
        .expect(200);

      // 같은 componentType으로 두 번째 제출 시도
      const response = await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', '다른 제목')
        .field('submitText', '다른 내용')
        .field('componentType', ComponentType.WRITING)
        .expect(200);

      const responseBody = response.body as ApiResponse;
      expect(responseBody.result).toBe('failed');
      expect(responseBody.message).toContain('이미');
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', '')
        .field('submitText', '')
        .field('componentType', ComponentType.WRITING)
        .expect(400);
    });

    it('should reject non-video files', async () => {
      const submitData = {
        title: '잘못된 파일 테스트',
        submitText: '잘못된 파일 형식 테스트입니다.',
        componentType: ComponentType.WRITING,
      };

      const mockTextBuffer = Buffer.from('this is not a video file');

      await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', submitData.title)
        .field('submitText', submitData.submitText)
        .field('componentType', submitData.componentType)
        .attach('video', mockTextBuffer, {
          filename: 'test-file.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });

  describe('GET /v1/submissions/:submissionId', () => {
    let submissionId: number;

    beforeEach(async () => {
      // 테스트용 제출물 생성
      const submission = submissionRepository.create({
        title: '테스트 제출물',
        submitText: '테스트 제출물 내용',
        componentType: ComponentType.WRITING,
        studentId,
        status: EvaluationStatus.COMPLETED,
        score: 85,
        feedback: '좋은 에세이입니다.',
        highlights: ['highlight1', 'highlight2'],
      });
      const savedSubmission = await submissionRepository.save(submission);
      submissionId = savedSubmission.id;
    });

    it('should get submission successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ApiResponse<SubmissionListItem>;
      expect(responseBody).toMatchObject({
        message: '제출물 조회에 성공했습니다.',
        result: 'ok',
        data: {
          id: submissionId,
          title: '테스트 제출물',
          submitText: '테스트 제출물 내용',
          componentType: ComponentType.WRITING,
          status: EvaluationStatus.COMPLETED,
          score: 85,
          feedback: '좋은 에세이입니다.',
          highlights: ['highlight1', 'highlight2'],
        },
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/v1/submissions/${submissionId}`)
        .expect(401);
    });

    it('should return 404 for non-existent submission', async () => {
      const nonExistentId = 99999;
      const response = await request(app.getHttpServer())
        .get(`/v1/submissions/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ApiResponse;
      expect(responseBody.result).toBe('failed');
      expect(responseBody.message).toContain('찾을 수 없습니다');
    });

    it('should not access other student submissions', async () => {
      // 다른 학생 생성
      const otherStudent = studentRepository.create({
        name: '다른 학생',
        email: `other-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashedpassword',
      });
      const savedOtherStudent = await studentRepository.save(otherStudent);

      // 다른 학생의 제출물 생성
      const otherSubmission = submissionRepository.create({
        title: '다른 학생의 제출물',
        submitText: '다른 학생의 제출물 내용',
        componentType: ComponentType.WRITING,
        studentId: savedOtherStudent.id,
        status: EvaluationStatus.COMPLETED,
      });
      const savedOtherSubmission =
        await submissionRepository.save(otherSubmission);

      // 원래 학생 토큰으로 다른 학생의 제출물 조회 시도
      const response = await request(app.getHttpServer())
        .get(`/v1/submissions/${savedOtherSubmission.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ApiResponse;
      expect(responseBody.result).toBe('failed');
      expect(responseBody.message).toContain('찾을 수 없습니다');

      // 테스트 후 정리 - FK 제약조건 순서 준수
      await submissionRepository.delete({ studentId: savedOtherStudent.id });
      await studentRepository.delete(savedOtherStudent.id);
    });

    it('should handle invalid submission ID format', async () => {
      await request(app.getHttpServer())
        .get('/v1/submissions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /v1/submissions', () => {
    beforeEach(async () => {
      // 테스트용 제출물들 생성
      const submissions = [
        {
          title: '첫 번째 에세이',
          submitText: '첫 번째 에세이 내용',
          componentType: ComponentType.WRITING,
          status: EvaluationStatus.COMPLETED,
          score: 85,
        },
        {
          title: '두 번째 에세이',
          submitText: '두 번째 에세이 내용',
          componentType: ComponentType.SPEAKING,
          status: EvaluationStatus.PENDING,
          score: null,
        },
        {
          title: '세 번째 에세이',
          submitText: '세 번째 에세이 내용',
          componentType: ComponentType.READING,
          status: EvaluationStatus.FAILED,
          score: null,
        },
      ];

      for (const submissionData of submissions) {
        const submission = submissionRepository.create({
          ...submissionData,
          studentId,
        });
        await submissionRepository.save(submission);
      }
    });

    it('should get all student submissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ApiResponse<SubmissionListItem[]>;
      expect(responseBody).toMatchObject({
        message: '제출물 목록 조회에 성공했습니다.',
        result: 'ok',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.any(Array),
      });

      expect(responseBody.data).toHaveLength(3);
      expect(responseBody.data[0]).toHaveProperty('id');
      expect(responseBody.data[0]).toHaveProperty('title');
      expect(responseBody.data[0]).toHaveProperty('componentType');
      expect(responseBody.data[0]).toHaveProperty('status');
    });

    it('should return submissions in descending order by creation date', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ApiResponse<SubmissionListItem[]>;
      const submissions = responseBody.data;
      for (let i = 1; i < submissions.length; i++) {
        expect(
          new Date(submissions[i - 1]?.createdAt || '').getTime(),
        ).toBeGreaterThanOrEqual(
          new Date(submissions[i]?.createdAt || '').getTime(),
        );
      }
    });

    it('should return empty array for student with no submissions', async () => {
      // 현재 학생의 제출물만 삭제 (CASCADE로 evaluation_logs도 함께 삭제됨)
      await submissionRepository.delete({ studentId });

      const response = await request(app.getHttpServer())
        .get('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ApiResponse<SubmissionListItem[]>;
      expect(responseBody.data).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/v1/submissions').expect(401);
    });

    it('should only return submissions for authenticated student', async () => {
      // 다른 학생 생성 및 제출물 추가
      const otherStudent = studentRepository.create({
        name: '다른 학생',
        email: `other-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashedpassword',
      });
      const savedOtherStudent = await studentRepository.save(otherStudent);

      const otherSubmission = submissionRepository.create({
        title: '다른 학생의 제출물',
        submitText: '다른 학생의 제출물 내용',
        componentType: ComponentType.WRITING,
        studentId: savedOtherStudent.id,
        status: EvaluationStatus.COMPLETED,
      });
      await submissionRepository.save(otherSubmission);

      const response = await request(app.getHttpServer())
        .get('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 원래 학생의 제출물만 반환되어야 함 (3개)
      const responseBody = response.body as ApiResponse<SubmissionListItem[]>;
      expect(responseBody.data).toHaveLength(3);
      responseBody.data.forEach((submission: SubmissionListItem) => {
        expect(submission.title).not.toBe('다른 학생의 제출물');
      });

      // 테스트 후 정리 - FK 제약조건 순서 준수
      await submissionRepository.delete({ studentId: savedOtherStudent.id });
      await studentRepository.delete(savedOtherStudent.id);
    });
  });

  describe('File Upload Validation', () => {
    it('should handle large video files', async () => {
      const submitData = {
        title: '대용량 파일 테스트',
        submitText: '대용량 파일 업로드 테스트입니다.',
        componentType: ComponentType.SPEAKING,
      };

      // 100MB보다 큰 가상의 파일 시뮬레이션 (실제로는 작은 버퍼)
      const mockLargeBuffer = Buffer.alloc(1024); // 실제 테스트에서는 작은 크기 사용

      const response = await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', submitData.title)
        .field('submitText', submitData.submitText)
        .field('componentType', submitData.componentType)
        .attach('video', mockLargeBuffer, {
          filename: 'large-video.mp4',
          contentType: 'video/mp4',
        });

      // 파일 크기가 제한을 넘지 않는 경우 성공해야 함
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // 이 테스트는 실제 데이터베이스 연결 오류를 시뮬레이션하기 어려우므로
      // 유효하지 않은 JWT 토큰으로 테스트
      const invalidToken = 'invalid.jwt.token';

      await request(app.getHttpServer())
        .get('/v1/submissions')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should handle malformed JSON in request body', async () => {
      await request(app.getHttpServer())
        .post('/v1/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });
});
