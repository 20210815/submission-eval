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
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { EssaysService } from './essays.service';
import { SubmitEssayDto } from './dto/submit-essay.dto';
import {
  EssayResponseDto,
  SubmitEssayResponseDto,
} from './dto/essay-response.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { FutureApiResponse } from '../common/interfaces/api-response.interface';

@Controller('essays')
@UseGuards(JwtAuthGuard)
export class EssaysController {
  constructor(private readonly essaysService: EssaysService) {}

  @Post('submit')
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
