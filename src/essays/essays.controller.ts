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
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { EssaysService } from './essays.service';
import { SubmitEssayDto } from './dto/submit-essay.dto';
import {
  EssayResponseDto,
  SubmitEssayResponseDto,
} from './dto/essay-response.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { FutureApiResponse } from '../common/interfaces/api-response.interface';
import {
  API_RESPONSE_SCHEMAS,
  ESSAY_VALIDATION_ERROR_EXAMPLES,
} from '../common/constants/api-response-schemas';

@ApiTags('Essays')
@ApiCookieAuth('token')
@Controller('essays')
@UseGuards(JwtAuthGuard)
export class EssaysController {
  constructor(private readonly essaysService: EssaysService) {}

  @Post('submit')
  @ApiCookieAuth('token')
  @ApiOperation({
    summary: '에세이 제출',
    description:
      '학생이 에세이를 제출합니다. 선택적으로 비디오 파일도 함께 업로드할 수 있습니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '에세이 제출 데이터',
    type: SubmitEssayDto,
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.ESSAY_SUBMIT_SUCCESS)
  @ApiResponse(ESSAY_VALIDATION_ERROR_EXAMPLES)
  @ApiResponse(API_RESPONSE_SCHEMAS.AUTHENTICATION_REQUIRED)
  @ApiResponse(API_RESPONSE_SCHEMAS.ESSAY_ALREADY_SUBMITTED)
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.includes('video')) {
          return callback(new Error('비디오 파일만 업로드 가능합니다.'), false);
        }
        callback(null, true);
      },
    }),
  )
  async submitEssay(
    @Req() req: Request,
    @Body() dto: SubmitEssayDto,
    @UploadedFile() videoFile?: Express.Multer.File,
  ): Promise<FutureApiResponse<SubmitEssayResponseDto | null>> {
    try {
      const studentId = req.user?.sub;
      if (!studentId) {
        return ResponseUtil.createFutureApiResponse<null>(
          '인증이 필요합니다.',
          null,
          'failed',
        );
      }

      const result = await this.essaysService.submitEssay(
        studentId,
        dto,
        videoFile,
      );

      return ResponseUtil.createFutureApiResponse(
        '에세이가 성공적으로 제출되었습니다.',
        result,
      );
    } catch (error) {
      return ResponseUtil.createFutureApiResponse<null>(
        error instanceof Error ? error.message : '에세이 제출에 실패했습니다.',
        null,
        'failed',
      );
    }
  }

  @Get(':id')
  @ApiCookieAuth('token')
  @ApiOperation({
    summary: '에세이 조회',
    description: '특정 에세이의 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '에세이 ID',
    type: Number,
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.ESSAY_GET_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.AUTHENTICATION_REQUIRED)
  @ApiResponse(API_RESPONSE_SCHEMAS.ESSAY_NOT_FOUND)
  async getEssay(
    @Req() req: Request,
    @Param('id', ParseIntPipe) essayId: number,
  ): Promise<FutureApiResponse<EssayResponseDto | null>> {
    try {
      const studentId = req.user?.sub;
      if (!studentId) {
        return ResponseUtil.createFutureApiResponse<null>(
          '인증이 필요합니다.',
          null,
          'failed',
        );
      }

      const result = await this.essaysService.getEssay(essayId, studentId);

      return ResponseUtil.createFutureApiResponse(
        '에세이 조회에 성공했습니다.',
        result,
      );
    } catch (error) {
      return ResponseUtil.createFutureApiResponse<null>(
        error instanceof Error ? error.message : '에세이 조회에 실패했습니다.',
        null,
        'failed',
      );
    }
  }

  @Get()
  @ApiCookieAuth('token')
  @ApiOperation({
    summary: '학생 에세이 목록 조회',
    description: '현재 로그인한 학생의 모든 에세이 목록을 조회합니다.',
  })
  @ApiResponse(API_RESPONSE_SCHEMAS.ESSAY_LIST_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.AUTHENTICATION_REQUIRED)
  async getStudentEssays(
    @Req() req: Request,
  ): Promise<FutureApiResponse<EssayResponseDto[] | null>> {
    try {
      const studentId = req.user?.sub;
      if (!studentId) {
        return ResponseUtil.createFutureApiResponse<null>(
          '인증이 필요합니다.',
          null,
          'failed',
        );
      }

      const result = await this.essaysService.getStudentEssays(studentId);

      return ResponseUtil.createFutureApiResponse(
        '에세이 목록 조회에 성공했습니다.',
        result,
      );
    } catch (error) {
      return ResponseUtil.createFutureApiResponse<null>(
        error instanceof Error
          ? error.message
          : '에세이 목록 조회에 실패했습니다.',
        null,
        'failed',
      );
    }
  }
}
