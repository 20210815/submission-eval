import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import {
  SubmissionResponseDto,
  SubmitSubmissionResponseDto,
} from './dto/submission-response.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { FutureApiResponse } from '../common/interfaces/api-response.interface';
import {
  API_RESPONSE_SCHEMAS,
  SUBMISSION_VALIDATION_ERROR_EXAMPLES,
  ALL_SUBMISSIONS_VALIDATION_ERROR_EXAMPLES,
  SERVER_ERROR_EXAMPLES,
} from '../common/constants/api-response-schemas';
import { KoreanParseIntPipe } from '../common/pipes/korean-parse-int.pipe';
import {
  SubmissionQueryDto,
  SubmissionListResponseDto,
} from './dto/submission-query.dto';

@ApiTags('Submissions')
@ApiBearerAuth()
@Controller('v1/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '에세이 제출',
    description: `
      학생이 에세이를 제출하고 AI 평가를 받습니다.
      
      ## Enhanced Features (v1.1.0)
      - **Input Validation**: 에세이 텍스트 10-10,000자 제한
      - **File Upload**: 향상된 비디오 파일 검증 (100MB 제한)
      - **Transaction Safety**: 데이터 일관성을 위한 트랜잭션 관리
      - **Duplicate Prevention**: componentType별 중복 제출 방지
      - **Concurrent Protection**: 동시 제출 방지 메커니즘
      
      ## 처리 과정
      1. 입력 검증 및 중복 체크
      2. 비디오 파일 처리 (선택사항)
      3. Azure Storage 업로드
      4. OpenAI API를 통한 AI 평가
      5. 텍스트 하이라이팅 처리
      6. 결과 저장 및 반환
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '에세이 제출 데이터',
    type: SubmitSubmissionDto,
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.SUBMISSION_SUBMIT_SUCCESS)
  @ApiResponse(SUBMISSION_VALIDATION_ERROR_EXAMPLES)
  @ApiResponse(API_RESPONSE_SCHEMAS.AUTHENTICATION_REQUIRED)
  @ApiResponse(API_RESPONSE_SCHEMAS.SUBMISSION_ALREADY_SUBMITTED)
  @ApiResponse(API_RESPONSE_SCHEMAS.CONCURRENT_SUBMISSION)
  @ApiResponse(SERVER_ERROR_EXAMPLES)
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.includes('video')) {
          return callback(
            new BadRequestException('비디오 파일만 업로드 가능합니다.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async submitSubmission(
    @Req() req: Request,
    @Body() dto: SubmitSubmissionDto,
    @UploadedFile() videoFile?: Express.Multer.File,
  ): Promise<FutureApiResponse<SubmitSubmissionResponseDto | null>> {
    try {
      const studentId = req.user?.sub;
      if (!studentId) {
        return ResponseUtil.createFutureApiResponse<null>(
          '인증이 필요합니다.',
          null,
          'failed',
        );
      }

      // Manual validation for empty required fields
      if (!dto.title || dto.title.trim() === '') {
        throw new BadRequestException('제목은 필수입니다.');
      }

      if (!dto.submitText || dto.submitText.trim() === '') {
        throw new BadRequestException('에세이 내용은 필수입니다.');
      }

      const result = await this.submissionsService.submitSubmission(
        studentId,
        dto,
        videoFile,
      );

      return ResponseUtil.createFutureApiResponse(
        '에세이가 성공적으로 제출되었습니다.',
        result,
      );
    } catch (error: unknown) {
      // Re-throw HTTP exceptions to let the exception filter handle them
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : '에세이 제출에 실패했습니다.';

      return ResponseUtil.createFutureApiResponse<null>(
        errorMessage,
        null,
        'failed',
      );
    }
  }

  @Get(':submissionId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '제출물 조회',
    description: '특정 제출물의 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'submissionId',
    description: '제출물 ID',
    type: Number,
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.SUBMISSION_GET_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.INVALID_ID_FORMAT)
  @ApiResponse(API_RESPONSE_SCHEMAS.AUTHENTICATION_REQUIRED)
  @ApiResponse(API_RESPONSE_SCHEMAS.SUBMISSION_NOT_FOUND)
  async getSubmission(
    @Req() req: Request,
    @Param('submissionId', KoreanParseIntPipe) submissionId: number,
  ): Promise<FutureApiResponse<SubmissionResponseDto | null>> {
    try {
      const studentId = req.user?.sub;
      if (!studentId) {
        return ResponseUtil.createFutureApiResponse<null>(
          '인증이 필요합니다.',
          null,
          'failed',
        );
      }

      const result = await this.submissionsService.getSubmission(
        submissionId,
        studentId,
      );

      return ResponseUtil.createFutureApiResponse(
        '제출물 조회에 성공했습니다.',
        result,
      );
    } catch (error) {
      return ResponseUtil.createFutureApiResponse<null>(
        error instanceof Error ? error.message : '제출물 조회에 실패했습니다.',
        null,
        'failed',
      );
    }
  }

  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '전체 제출물 목록 조회 (관리자용)',
    description: `
      모든 제출물의 목록을 필터링, 정렬, 페이지네이션과 함께 조회합니다.
      
      ## 기능
      - **필터링**: 평가 상태, 학생 ID, 학생 이름, 제목으로 필터링
      - **정렬**: 생성일, 수정일, 점수, 제목 기준 오름차순/내림차순 정렬
      - **페이지네이션**: 페이지 번호와 크기 지정 (최대 100개)
      - **검색**: 학생 이름 및 제출물 제목 부분 일치 검색
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '페이지 번호 (기본값: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '페이지 크기 (기본값: 20, 최대: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 기준 (기본값: createdAt,DESC)',
    example: 'createdAt,DESC',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '평가 상태 필터',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description: '학생 ID 필터',
    example: 123,
  })
  @ApiQuery({
    name: 'studentName',
    required: false,
    description: '학생 이름 검색 (부분 일치)',
    example: '홍길동',
  })
  @ApiQuery({
    name: 'title',
    required: false,
    description: '제출물 제목 검색 (부분 일치)',
    example: 'English Essay',
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.ALL_SUBMISSIONS_SUCCESS)
  @ApiResponse(ALL_SUBMISSIONS_VALIDATION_ERROR_EXAMPLES)
  @ApiResponse(API_RESPONSE_SCHEMAS.AUTHENTICATION_REQUIRED)
  @ApiResponse(SERVER_ERROR_EXAMPLES)
  async getAllSubmissions(
    @Query() queryDto: SubmissionQueryDto,
  ): Promise<FutureApiResponse<SubmissionListResponseDto | null>> {
    try {
      const result = await this.submissionsService.getAllSubmissions(queryDto);

      return ResponseUtil.createFutureApiResponse(
        '전체 제출물 목록 조회에 성공했습니다.',
        result,
      );
    } catch (error) {
      return ResponseUtil.createFutureApiResponse<null>(
        error instanceof Error
          ? error.message
          : '전체 제출물 목록 조회에 실패했습니다.',
        null,
        'failed',
      );
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '학생 제출물 목록 조회',
    description: '현재 로그인한 학생의 모든 제출물 목록을 조회합니다.',
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.SUBMISSION_LIST_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.AUTHENTICATION_REQUIRED)
  async getStudentSubmissions(
    @Req() req: Request,
  ): Promise<FutureApiResponse<SubmissionResponseDto[] | null>> {
    try {
      const studentId = req.user?.sub;
      if (!studentId) {
        return ResponseUtil.createFutureApiResponse<null>(
          '인증이 필요합니다.',
          null,
          'failed',
        );
      }

      const result =
        await this.submissionsService.getStudentSubmissions(studentId);

      return ResponseUtil.createFutureApiResponse(
        '제출물 목록 조회에 성공했습니다.',
        result,
      );
    } catch (error) {
      return ResponseUtil.createFutureApiResponse<null>(
        error instanceof Error
          ? error.message
          : '제출물 목록 조회에 실패했습니다.',
        null,
        'failed',
      );
    }
  }
}
