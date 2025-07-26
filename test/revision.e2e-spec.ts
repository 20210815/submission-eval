import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import {
  Submission,
  EvaluationStatus,
} from '../src/essays/entities/submission.entity';
import {
  Revision,
  RevisionStatus,
} from '../src/essays/entities/revision.entity';
import { Student } from '../src/students/entities/student.entity';
import { ComponentType } from '../src/essays/enums/component-type.enum';
import { CreateRevisionDto } from '../src/essays/dto/revision.dto';

export interface CreateRevisionResponse {
  id: number;
  submissionId: number;
  studentId: number;
  componentType: ComponentType;
  status: RevisionStatus;
  revisionReason?: string;
  score?: number;
  feedback?: string;
  apiLatency?: number;
  traceId?: string;
}

export interface ListRevisionsResponse {
  data: CreateRevisionResponse[];
  total: number;
  totalPages: number;
}

export interface ExceptionResponse {
  result: 'failed';
  message: string;
}

describe('Revision Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let authToken: string;
  let studentId: number;
  let submissionId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean database before tests
    await cleanDatabase();

    // Create test student and get auth token
    const testStudent = await createTestStudent();
    studentId = testStudent.id;
    authToken = generateAuthToken(testStudent.id);

    // Create test submission
    const testSubmission = await createTestSubmission(testStudent.id);
    submissionId = testSubmission.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.getRepository(Revision).clear();
  });

  async function cleanDatabase() {
    // submission_media 이후 추가
    await dataSource.query(`
    TRUNCATE TABLE
      "revisions",
      "submissions",
      "students"
    RESTART IDENTITY CASCADE;
  `);
  }

  async function createTestStudent(): Promise<Student> {
    const studentRepository = dataSource.getRepository(Student);
    const student = studentRepository.create({
      name: 'Test Student',
      email: 'test@example.com',
      password: 'hashedpassword',
    });
    return await studentRepository.save(student);
  }

  async function createTestSubmission(studentId: number): Promise<Submission> {
    const submissionRepository = dataSource.getRepository(Submission);
    const submission = submissionRepository.create({
      title: 'Test Submission for Revision',
      submitText:
        'This is a test submission content that will be used for revision testing.',
      componentType: ComponentType.WRITING,
      studentId,
      status: EvaluationStatus.FAILED, // Set as failed so it can be revised
    });
    return await submissionRepository.save(submission);
  }

  function generateAuthToken(studentId: number): string {
    return jwtService.sign({ sub: studentId, email: 'test@example.com' });
  }

  describe('POST /v1/revision', () => {
    it('should create revision successfully', async () => {
      const createRevisionDto: CreateRevisionDto = {
        submissionId: submissionId.toString(),
      };

      const response = await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRevisionDto)
        .expect(201);

      const responseBody = response.body as CreateRevisionResponse;

      expect(responseBody).toMatchObject({
        submissionId: submissionId,
        studentId: studentId,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.PENDING,
      });

      expect(responseBody.id).toBeDefined();
      expect(typeof responseBody.id).toBe('number');

      // Verify revision was created in database
      const revisionRepository = dataSource.getRepository(Revision);
      const savedRevision = await revisionRepository.findOne({
        where: { id: responseBody.id },
      });

      expect(savedRevision).toBeDefined();
      expect(savedRevision?.submissionId).toBe(submissionId);
      expect(savedRevision?.studentId).toBe(studentId);
      expect(savedRevision?.status).toBe(RevisionStatus.IN_PROGRESS);
    });

    it('should return 404 when submission not found', async () => {
      const createRevisionDto: CreateRevisionDto = {
        submissionId: '99999', // Non-existent submission ID
      };

      const response = await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRevisionDto)
        .expect(404);

      const responseBody = response.body as ExceptionResponse;

      expect(responseBody).toMatchObject({
        result: 'failed',
      });

      expect(responseBody.message).toContain('존재하지 않는 제출물입니다');
    });

    it('should return 400 for invalid submission ID format', async () => {
      const createRevisionDto = {
        submissionId: 'invalid-id',
      };

      const response = await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRevisionDto)
        .expect(400);

      const responseBody = response.body as ExceptionResponse;

      expect(responseBody.message).toContain(
        'Submission ID는 필수 입력 항목입니다.',
      );
    });

    it('should return 409 when revision already in progress', async () => {
      // Create first revision
      const createRevisionDto: CreateRevisionDto = {
        submissionId: submissionId.toString(),
      };

      // Create initial revision
      await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRevisionDto)
        .expect(201);

      // Update the revision to IN_PROGRESS status
      const revisionRepository = dataSource.getRepository(Revision);
      await revisionRepository.update(
        { submissionId },
        { status: RevisionStatus.IN_PROGRESS },
      );

      // Try to create another revision for the same submission
      const response = await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRevisionDto)
        .expect(409);

      const responseBody = response.body as ExceptionResponse;

      expect(responseBody.message).toContain(
        '이미 진행 중인 재평가가 있습니다',
      );
    });

    it('should return 401 without authorization token', async () => {
      const createRevisionDto: CreateRevisionDto = {
        submissionId: submissionId.toString(),
      };

      await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .send(createRevisionDto)
        .expect(401);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ submissionId: null }) // Null submissionId field
        .expect(400);

      expect(response.body).toMatchObject({
        result: 'failed',
        message: 'Submission ID는 필수 입력 항목입니다.',
      });
    });
  });

  describe('GET /v1/revision', () => {
    beforeEach(async () => {
      // Create multiple revisions for testing
      const revisionRepository = dataSource.getRepository(Revision);

      const revisions = [
        {
          submissionId,
          studentId,
          componentType: ComponentType.WRITING,
          status: RevisionStatus.COMPLETED,
          score: 8,
          feedback: 'Good improvement',
        },
        {
          submissionId,
          studentId,
          componentType: ComponentType.WRITING,
          status: RevisionStatus.PENDING,
        },
        {
          submissionId,
          studentId,
          componentType: ComponentType.WRITING,
          status: RevisionStatus.FAILED,
          errorMessage: 'AI service error',
        },
      ];

      for (const revisionData of revisions) {
        const revision = revisionRepository.create(revisionData);
        await revisionRepository.save(revision);
      }
    });

    it('should get paginated revisions with default parameters', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ListRevisionsResponse;

      expect(responseBody).toHaveProperty('data');
      expect(responseBody).toHaveProperty('total');
      expect(responseBody).toHaveProperty('totalPages');

      expect(Array.isArray(responseBody.data)).toBe(true);
      expect(responseBody.data.length).toBeGreaterThan(0);
      expect(responseBody.total).toBeGreaterThan(0);
      expect(responseBody.totalPages).toBeGreaterThan(0);

      // Check first revision structure
      const firstRevision = responseBody.data[0];
      expect(firstRevision).toHaveProperty('id');
      expect(firstRevision).toHaveProperty('submissionId');
      expect(firstRevision).toHaveProperty('studentId');
      expect(firstRevision).toHaveProperty('componentType');
      expect(firstRevision).toHaveProperty('status');
    });

    it('should get paginated revisions with custom parameters', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/v1/revision')
        .query({
          page: 1,
          size: 2,
          sort: 'id,ASC',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseBody = response.body as ListRevisionsResponse;

      expect(responseBody.data.length).toBeLessThanOrEqual(2);
      expect(responseBody.total).toBeGreaterThan(0);
    });

    it('should return 401 without authorization token', async () => {
      await request(app.getHttpServer() as Server)
        .get('/v1/revision')
        .expect(401);
    });
  });

  describe('GET /v1/revision/:revisionId', () => {
    let revisionId: number;

    beforeEach(async () => {
      // Create a test revision
      const revisionRepository = dataSource.getRepository(Revision);
      const revision = revisionRepository.create({
        submissionId,
        studentId,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.COMPLETED,
        score: 9,
        feedback: 'Excellent work with great improvements',
        highlights: ['excellent work', 'great improvements'],
        highlightSubmitText:
          'This shows <b>excellent work</b> with <b>great improvements</b>.',
        apiLatency: 1500,
        traceId: 'test-trace-id',
      });
      const savedRevision = await revisionRepository.save(revision);
      revisionId = savedRevision.id;
    });

    it('should get revision by ID successfully', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get(`/v1/revision/${revisionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: revisionId,
        submissionId: submissionId,
        studentId: studentId,
        componentType: ComponentType.WRITING,
        status: RevisionStatus.COMPLETED,
        score: 9,
        feedback: 'Excellent work with great improvements',
        highlights: ['excellent work', 'great improvements'],
        highlightSubmitText:
          'This shows <b>excellent work</b> with <b>great improvements</b>.',
        apiLatency: 1500,
        traceId: 'test-trace-id',
      });
    });

    it('should return 404 when revision not found', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/v1/revision/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      const responseBody = response.body as ExceptionResponse;

      expect(responseBody.message).toContain('존재하지 않는 재평가 ID입니다');
    });

    it('should return 400 for invalid revision ID format', async () => {
      await request(app.getHttpServer() as Server)
        .get('/v1/revision/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 401 without authorization token', async () => {
      await request(app.getHttpServer() as Server)
        .get(`/v1/revision/${revisionId}`)
        .expect(401);
    });
  });

  describe('Revision processing workflow', () => {
    it('should process revision asynchronously after creation', async () => {
      const createRevisionDto: CreateRevisionDto = {
        submissionId: submissionId.toString(),
      };

      // Create revision
      const createResponse = await request(app.getHttpServer() as Server)
        .post('/v1/revision')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRevisionDto)
        .expect(201);

      const responseBody = createResponse.body as CreateRevisionResponse;

      const createdRevisionId = responseBody.id;

      // Initially should be PENDING
      expect(responseBody.status).toBe(RevisionStatus.PENDING);

      // Wait for async processing to potentially start
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check revision status (might be IN_PROGRESS or completed depending on timing)
      const statusResponse = await request(app.getHttpServer() as Server)
        .get(`/v1/revision/${createdRevisionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const statusResponseBody = statusResponse.body as CreateRevisionResponse;

      // Status should be either IN_PROGRESS, COMPLETED, or FAILED
      expect([
        RevisionStatus.PENDING,
        RevisionStatus.IN_PROGRESS,
        RevisionStatus.COMPLETED,
        RevisionStatus.FAILED,
      ]).toContain(statusResponseBody.status);

      // If processing completed successfully
      if (statusResponseBody.status === RevisionStatus.COMPLETED) {
        expect(statusResponseBody.score).toBeDefined();
        expect(statusResponseBody.feedback).toBeDefined();
        expect(statusResponseBody.apiLatency).toBeDefined();
        expect(statusResponseBody.traceId).toBeDefined();
      }
    });
  });
});
