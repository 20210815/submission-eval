import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from '../src/essays/submissions.service';
import {
  Submission,
  EvaluationStatus,
} from '../src/essays/entities/submission.entity';
import { ComponentType } from '../src/essays/enums/component-type.enum';
import {
  EvaluationLog,
  LogType,
  LogStatus,
} from '../src/essays/entities/evaluation-log.entity';
import { Student } from '../src/students/entities/student.entity';
import { VideoProcessingService } from '../src/essays/services/video-processing.service';
import { AzureStorageService } from '../src/essays/services/azure-storage.service';
import { OpenAIService } from '../src/essays/services/openai.service';
import { TextHighlightingService } from '../src/essays/services/text-highlighting.service';
import { NotificationService } from '../src/essays/services/notification.service';
import { SubmitSubmissionDto } from '../src/essays/dto/submit-submission.dto';
import { AppModule } from '../src/app.module';

describe('SubmissionsService (e2e)', () => {
  let app: INestApplication;
  let service: SubmissionsService;
  let submissionRepository: Repository<Submission>;
  let evaluationLogRepository: Repository<EvaluationLog>;
  let studentRepository: Repository<Student>;
  let videoProcessingService: VideoProcessingService;
  let azureStorageService: AzureStorageService;
  let openAIService: OpenAIService;
  let textHighlightingService: TextHighlightingService;
  let notificationService: NotificationService;
  let testStudent: Student;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    service = module.get<SubmissionsService>(SubmissionsService);
    submissionRepository = module.get<Repository<Submission>>(
      getRepositoryToken(Submission),
    );
    evaluationLogRepository = module.get<Repository<EvaluationLog>>(
      getRepositoryToken(EvaluationLog),
    );
    studentRepository = module.get<Repository<Student>>(
      getRepositoryToken(Student),
    );
    videoProcessingService = module.get<VideoProcessingService>(
      VideoProcessingService,
    );
    azureStorageService = module.get<AzureStorageService>(AzureStorageService);
    openAIService = module.get<OpenAIService>(OpenAIService);
    textHighlightingService = module.get<TextHighlightingService>(
      TextHighlightingService,
    );
    notificationService = module.get<NotificationService>(NotificationService);

    // 테스트용 학생 생성 - 유니크 이메일 사용
    const student = studentRepository.create({
      name: '테스트 학생',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedpassword',
    });
    testStudent = await studentRepository.save(student);
  });

  afterAll(async () => {
    // 테스트 데이터 정리 - FK 제약조건 순서 준수
    const dataSource = app.get(DataSource);
    await dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM evaluation_logs');
      await manager.query('DELETE FROM submissions');
      await manager.query('DELETE FROM students');
      await manager.query('ALTER SEQUENCE students_id_seq RESTART WITH 1');
      await manager.query('ALTER SEQUENCE submissions_id_seq RESTART WITH 1');
      await manager.query(
        'ALTER SEQUENCE evaluation_logs_id_seq RESTART WITH 1',
      );
    });
    await app.close();
  });

  afterEach(async () => {
    // 각 테스트 후에 에세이와 로그 데이터만 정리 - student는 유지
    const dataSource = app.get(DataSource);
    await dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM evaluation_logs');
      await manager.query('DELETE FROM submissions');
      await manager.query('ALTER SEQUENCE submissions_id_seq RESTART WITH 1');
      await manager.query(
        'ALTER SEQUENCE evaluation_logs_id_seq RESTART WITH 1',
      );
    });

    // processingStudents Map 초기화
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (service as any).processingStudents.clear();
  });

  describe('submitSubmission', () => {
    const mockSubmitSubmissionDto: SubmitSubmissionDto = {
      title: '테스트 제출물',
      submitText:
        '이것은 테스트 제출물 내용입니다. 평가를 위한 충분한 텍스트가 필요합니다.',
      componentType: ComponentType.WRITING,
    };

    beforeEach(async () => {
      // testStudent가 존재하는지 확인하고 없으면 새로 생성
      const studentExists = await studentRepository.findOne({
        where: { id: testStudent.id },
      });

      if (!studentExists) {
        const student = studentRepository.create({
          name: '테스트 학생',
          email: `test-${Date.now()}-${Math.random()}@example.com`,
          password: 'hashedpassword',
        });
        testStudent = await studentRepository.save(student);
      }

      // Mock services
      jest.spyOn(openAIService, 'evaluateSubmission').mockResolvedValue({
        score: 85,
        feedback: '좋은 에세이입니다. 구조가 잘 잡혀있고 내용이 충실합니다.',
        highlights: ['좋은', '구조', '충실'],
      });

      jest
        .spyOn(textHighlightingService, 'highlightText')
        .mockReturnValue(
          '이것은 <mark>좋은</mark> 테스트 에세이 내용입니다. <mark>구조</mark>가 잘 잡혀있고 내용이 <mark>충실</mark>합니다.',
        );

      jest.spyOn(videoProcessingService, 'processVideo').mockResolvedValue({
        videoPath: '/tmp/processed-video.mp4',
        audioPath: '/tmp/extracted-audio.wav',
      });

      jest.spyOn(azureStorageService, 'uploadVideo').mockResolvedValue({
        url: 'https://example.com/video.mp4',
        sasUrl: 'https://example.com/video.mp4',
        blobName: 'video_123.mp4',
      });

      jest.spyOn(azureStorageService, 'uploadAudio').mockResolvedValue({
        url: 'https://example.com/audio.wav',
        sasUrl: 'https://example.com/audio.wav',
        blobName: 'audio_123.wav',
      });

      jest
        .spyOn(videoProcessingService, 'cleanupProcessedFiles')
        .mockImplementation();
      jest
        .spyOn(notificationService, 'notifyEvaluationFailure')
        .mockResolvedValue();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should submit submission successfully without video', async () => {
      const result = await service.submitSubmission(
        testStudent.id,
        mockSubmitSubmissionDto,
      );

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        submissionId: expect.any(Number),
        studentId: testStudent.id,
        status: EvaluationStatus.COMPLETED,
        score: 85,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        feedback: expect.stringContaining('좋은 에세이'),
        highlights: ['좋은', '구조', '충실'],
        submitText: mockSubmitSubmissionDto.submitText,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        highlightSubmitText: expect.stringContaining('<mark>'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        apiLatency: expect.any(Number),
      });

      // 데이터베이스에 저장되었는지 확인
      const savedSubmission = await submissionRepository.findOne({
        where: { id: result.submissionId },
      });
      expect(savedSubmission).toBeTruthy();
      expect(savedSubmission?.status).toBe(EvaluationStatus.COMPLETED);
      expect(savedSubmission?.score).toBe(85);

      // 평가 로그가 생성되었는지 확인
      const logs = await evaluationLogRepository.find({
        where: { submissionId: result.submissionId },
      });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.type === LogType.AI_EVALUATION)).toBe(true);
      expect(logs.some((log) => log.type === LogType.TEXT_HIGHLIGHTING)).toBe(
        true,
      );
    });

    it('should submit essay successfully with video', async () => {
      const mockVideoFile: Express.Multer.File = {
        fieldname: 'video',
        originalname: 'test-video.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024,
        buffer: Buffer.from('fake video content'),
        destination: '',
        filename: '',
        path: '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stream: null as any,
      };

      const result = await service.submitSubmission(
        testStudent.id,
        mockSubmitSubmissionDto,
        mockVideoFile,
      );

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        submissionId: expect.any(Number),
        studentId: testStudent.id,
        status: EvaluationStatus.COMPLETED,
        videoUrl: 'https://example.com/video.mp4',
        audioUrl: 'https://example.com/audio.wav',
      });

      // 비디오 처리 서비스들이 호출되었는지 확인
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(videoProcessingService.processVideo).toHaveBeenCalledWith(
        mockVideoFile.buffer,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(azureStorageService.uploadVideo).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(azureStorageService.uploadAudio).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(videoProcessingService.cleanupProcessedFiles).toHaveBeenCalled();

      // 비디오 관련 로그가 생성되었는지 확인
      const logs = await evaluationLogRepository.find({
        where: { submissionId: result.submissionId },
      });
      expect(logs.some((log) => log.type === LogType.VIDEO_PROCESSING)).toBe(
        true,
      );
      expect(logs.some((log) => log.type === LogType.AZURE_UPLOAD)).toBe(true);
    });

    it('should prevent duplicate submission for same componentType', async () => {
      // 첫 번째 제출
      await service.submitSubmission(testStudent.id, mockSubmitSubmissionDto);

      // 같은 componentType으로 두 번째 제출 시도
      await expect(
        service.submitSubmission(testStudent.id, {
          ...mockSubmitSubmissionDto,
          title: '두 번째 에세이',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent concurrent submissions from same student', async () => {
      // processingStudents Map이 깨끗한 상태인지 확인
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (service as any).processingStudents.clear();

      // 두 개의 동시 제출 시도
      const promise1 = service.submitSubmission(
        testStudent.id,
        mockSubmitSubmissionDto,
      );
      const promise2 = service.submitSubmission(testStudent.id, {
        ...mockSubmitSubmissionDto,
        componentType: ComponentType.SPEAKING,
      });

      const results = await Promise.allSettled([promise1, promise2]);

      // 하나는 성공, 하나는 ConflictException으로 실패해야 함
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const errorCount = results.filter(
        (r) =>
          r.status === 'rejected' &&
          r.reason instanceof ConflictException &&
          r.reason.message.includes('진행 중'),
      ).length;

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);
    });

    it('should handle OpenAI service failure', async () => {
      // processingStudents Map 초기화
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (service as any).processingStudents.clear();

      jest
        .spyOn(openAIService, 'evaluateSubmission')
        .mockRejectedValue(new Error('OpenAI API Error'));

      await expect(
        service.submitSubmission(testStudent.id, mockSubmitSubmissionDto),
      ).rejects.toThrow('OpenAI API Error');

      // 실패한 제출물이 FAILED 상태로 저장되는지 확인
      const submissions = await submissionRepository.find({
        where: { studentId: testStudent.id },
      });
      expect(submissions.length).toBe(1);
      expect(submissions[0]?.status).toBe(EvaluationStatus.FAILED);
      expect(submissions[0]?.errorMessage).toBe('OpenAI API Error');

      // 실패 로그가 생성되었는지 확인
      const logs = await evaluationLogRepository.find({
        where: { submissionId: submissions[0]?.id, status: LogStatus.FAILED },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle video processing failure', async () => {
      // processingStudents Map 초기화
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (service as any).processingStudents.clear();

      jest
        .spyOn(videoProcessingService, 'processVideo')
        .mockRejectedValue(new Error('Video processing failed'));

      const mockVideoFile: Express.Multer.File = {
        fieldname: 'video',
        originalname: 'test-video.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024,
        buffer: Buffer.from('fake video content'),
        destination: '',
        filename: '',
        path: '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stream: null as any,
      };

      await expect(
        service.submitSubmission(
          testStudent.id,
          mockSubmitSubmissionDto,
          mockVideoFile,
        ),
      ).rejects.toThrow('Video processing failed');

      // 알림 서비스가 호출되었는지 확인
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(notificationService.notifyEvaluationFailure).toHaveBeenCalled();
    });

    it('should handle azure storage failure', async () => {
      // processingStudents Map 초기화
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (service as any).processingStudents.clear();

      jest
        .spyOn(azureStorageService, 'uploadVideo')
        .mockRejectedValue(new Error('Azure storage upload failed'));

      const mockVideoFile: Express.Multer.File = {
        fieldname: 'video',
        originalname: 'test-video.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024,
        buffer: Buffer.from('fake video content'),
        destination: '',
        filename: '',
        path: '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stream: null as any,
      };

      await expect(
        service.submitSubmission(
          testStudent.id,
          mockSubmitSubmissionDto,
          mockVideoFile,
        ),
      ).rejects.toThrow('Azure storage upload failed');

      // 임시 파일 정리가 호출되었는지 확인
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(videoProcessingService.cleanupProcessedFiles).toHaveBeenCalled();
    });
  });

  describe('getSubmission', () => {
    let testSubmission: Submission;

    beforeEach(async () => {
      // testStudent가 존재하는지 확인하고 없으면 새로 생성
      const studentExists = await studentRepository.findOne({
        where: { id: testStudent.id },
      });

      if (!studentExists) {
        const student = studentRepository.create({
          name: '테스트 학생',
          email: `test-${Date.now()}-${Math.random()}@example.com`,
          password: 'hashedpassword',
        });
        testStudent = await studentRepository.save(student);
      }

      const submission = submissionRepository.create({
        title: '테스트 제출물',
        submitText: '테스트 제출물 내용',
        componentType: ComponentType.WRITING,
        studentId: testStudent.id,
        status: EvaluationStatus.COMPLETED,
        score: 90,
        feedback: '훌륭한 에세이입니다.',
        highlights: ['훌륭한', '에세이'],
        highlightSubmitText: '<mark>훌륭한</mark> <mark>에세이</mark> 내용',
      });
      testSubmission = await submissionRepository.save(submission);
    });

    it('should get submission successfully', async () => {
      const result = await service.getSubmission(
        testSubmission.id,
        testStudent.id,
      );

      expect(result).toMatchObject({
        id: testSubmission.id,
        title: '테스트 에세이',
        submitText: '테스트 에세이 내용',
        componentType: ComponentType.WRITING,
        status: EvaluationStatus.COMPLETED,
        score: 90,
        feedback: '훌륭한 에세이입니다.',
        highlights: ['훌륭한', '에세이'],
        highlightSubmitText: '<mark>훌륭한</mark> <mark>에세이</mark> 내용',
      });
    });

    it('should throw NotFoundException for non-existent submission', async () => {
      const nonExistentId = 99999;

      await expect(
        service.getSubmission(nonExistentId, testStudent.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when accessing other student essay', async () => {
      // 다른 학생 생성
      const otherStudent = studentRepository.create({
        name: '다른 학생',
        email: 'other@example.com',
        password: 'hashedpassword',
      });
      const savedOtherStudent = await studentRepository.save(otherStudent);

      // 다른 학생 ID로 제출물 조회 시도
      await expect(
        service.getSubmission(testSubmission.id, savedOtherStudent.id),
      ).rejects.toThrow(NotFoundException);

      // 테스트 후 정리
      await studentRepository.delete(savedOtherStudent.id);
    });
  });

  describe('getStudentSubmissions', () => {
    beforeEach(async () => {
      // testStudent가 존재하는지 확인하고 없으면 새로 생성
      const studentExists = await studentRepository.findOne({
        where: { id: testStudent.id },
      });

      if (!studentExists) {
        const student = studentRepository.create({
          name: '테스트 학생',
          email: `test-${Date.now()}-${Math.random()}@example.com`,
          password: 'hashedpassword',
        });
        testStudent = await studentRepository.save(student);
      }

      // 여러 제출물 생성
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
          studentId: testStudent.id,
        });
        await submissionRepository.save(submission);
      }
    });

    it('should get all student submissions ordered by creation date desc', async () => {
      const result = await service.getStudentSubmissions(testStudent.id);

      expect(result).toHaveLength(3);
      expect(result[0]?.title).toBe('세 번째 에세이'); // 가장 최근 생성
      expect(result[1]?.title).toBe('두 번째 에세이');
      expect(result[2]?.title).toBe('첫 번째 에세이');

      // 결과 구조 확인
      result.forEach((submission) => {
        expect(submission).toHaveProperty('id');
        expect(submission).toHaveProperty('title');
        expect(submission).toHaveProperty('submitText');
        expect(submission).toHaveProperty('componentType');
        expect(submission).toHaveProperty('status');
        expect(submission).toHaveProperty('createdAt');
        expect(submission).toHaveProperty('updatedAt');
      });
    });

    it('should return empty array for student with no submissions', async () => {
      // 모든 제출물 삭제
      await submissionRepository.delete({ studentId: testStudent.id });

      const result = await service.getStudentSubmissions(testStudent.id);

      expect(result).toEqual([]);
    });

    it('should not return other students submissions', async () => {
      // 다른 학생과 에세이 생성
      const otherStudent = studentRepository.create({
        name: '다른 학생',
        email: 'other@example.com',
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

      const result = await service.getStudentSubmissions(testStudent.id);

      // 원래 학생의 에세이만 반환되어야 함
      expect(result).toHaveLength(3);
      result.forEach((submission) => {
        expect(submission.title).not.toBe('다른 학생의 에세이');
      });

      // 테스트 후 정리는 afterAll에서 처리됨
    });
  });

  describe('logEvaluation', () => {
    let testSubmission: Submission;

    beforeEach(async () => {
      // testStudent가 존재하는지 확인하고 없으면 새로 생성
      const studentExists = await studentRepository.findOne({
        where: { id: testStudent.id },
      });

      if (!studentExists) {
        const student = studentRepository.create({
          name: '테스트 학생',
          email: `test-${Date.now()}-${Math.random()}@example.com`,
          password: 'hashedpassword',
        });
        testStudent = await studentRepository.save(student);
      }

      const submission = submissionRepository.create({
        title: '로그 테스트 에세이',
        submitText: '로그 테스트 내용',
        componentType: ComponentType.WRITING,
        studentId: testStudent.id,
        status: EvaluationStatus.PENDING,
      });
      testSubmission = await submissionRepository.save(submission);

      // testSubmission가 제대로 저장되었는지 확인
      expect(testSubmission).toBeTruthy();
      expect(testSubmission.id).toBeDefined();
    });

    it('should create evaluation log successfully', async () => {
      const logData = {
        requestUri: '/api/test',
        latency: 1500,
        requestData: { test: 'data' },
        responseData: { result: 'success' },
        traceId: 'test-trace-123',
      };

      await service.logEvaluation(
        testSubmission.id,
        LogType.AI_EVALUATION,
        LogStatus.SUCCESS,
        logData,
      );

      const logs = await evaluationLogRepository.find({
        where: { submissionId: testSubmission.id },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        submissionId: testSubmission.id,
        type: LogType.AI_EVALUATION,
        status: LogStatus.SUCCESS,
        requestUri: '/api/test',
        latency: 1500,
        requestData: { test: 'data' },
        responseData: { result: 'success' },
        traceId: 'test-trace-123',
      });
    });

    it('should create error log with error message', async () => {
      const logData = {
        latency: 500,
        errorMessage: 'API call failed',
        traceId: 'error-trace-456',
      };

      await service.logEvaluation(
        testSubmission.id,
        LogType.VIDEO_PROCESSING,
        LogStatus.FAILED,
        logData,
      );

      const logs = await evaluationLogRepository.find({
        where: { submissionId: testSubmission.id, status: LogStatus.FAILED },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: LogType.VIDEO_PROCESSING,
        status: LogStatus.FAILED,
        errorMessage: 'API call failed',
        traceId: 'error-trace-456',
      });
    });
  });

  describe('Service Integration', () => {
    beforeEach(async () => {
      // testStudent가 존재하는지 확인하고 없으면 새로 생성
      const studentExists = await studentRepository.findOne({
        where: { id: testStudent.id },
      });

      if (!studentExists) {
        const student = studentRepository.create({
          name: '테스트 학생',
          email: `test-${Date.now()}-${Math.random()}@example.com`,
          password: 'hashedpassword',
        });
        testStudent = await studentRepository.save(student);
      }

      // 모든 서비스가 정상 작동하도록 Mock 설정
      jest.spyOn(openAIService, 'evaluateSubmission').mockResolvedValue({
        score: 88,
        feedback: '통합 테스트를 위한 피드백입니다.',
        highlights: ['통합', '테스트'],
      });

      jest
        .spyOn(textHighlightingService, 'highlightText')
        .mockReturnValue('<mark>통합</mark> <mark>테스트</mark> 내용입니다.');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should complete full submission workflow', async () => {
      const dto: SubmitSubmissionDto = {
        title: '통합 테스트 에세이',
        submitText: '통합 테스트 내용입니다.',
        componentType: ComponentType.WRITING,
      };

      // 1. 에세이 제출
      const submitResult = await service.submitSubmission(testStudent.id, dto);
      expect(submitResult.status).toBe(EvaluationStatus.COMPLETED);

      // 2. 에세이 조회
      const getResult = await service.getSubmission(
        submitResult.submissionId,
        testStudent.id,
      );
      expect(getResult.id).toBe(submitResult.submissionId);
      expect(getResult.title).toBe(dto.title);

      // 3. 학생 제출물 목록 조회
      const listResult = await service.getStudentSubmissions(testStudent.id);
      expect(listResult).toHaveLength(1);
      expect(listResult[0]?.id).toBe(submitResult.submissionId);

      // 4. 평가 로그 확인
      const logs = await evaluationLogRepository.find({
        where: { submissionId: submitResult.submissionId },
      });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.status === LogStatus.SUCCESS)).toBe(true);
    });
  });
});
