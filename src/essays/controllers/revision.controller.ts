import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RevisionService } from '../services/revision.service';
import { CreateRevisionDto, RevisionResponseDto } from '../dto/revision.dto';

@ApiTags('Revisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/revision')
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  @Post()
  @ApiOperation({
    summary: '재평가 요청',
    description: '실패한 에세이 평가에 대해 재평가를 요청합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '재평가 요청이 성공적으로 생성되었습니다.',
    type: RevisionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '에세이를 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: 409,
    description: '이미 진행 중인 재평가가 있습니다.',
  })
  async createRevision(
    @Body() createRevisionDto: CreateRevisionDto,
  ): Promise<RevisionResponseDto> {
    return this.revisionService.createRevision(createRevisionDto);
  }

  @Get()
  @ApiOperation({
    summary: '재평가 목록 조회',
    description: '페이지네이션과 정렬을 지원하는 재평가 목록을 조회합니다.',
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
    description: '페이지 크기 (기본값: 20)',
    example: 20,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 기준 (기본값: createdAt,DESC)',
    example: 'createdAt,DESC',
  })
  @ApiResponse({
    status: 200,
    description: '재평가 목록이 성공적으로 조회되었습니다.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/RevisionResponseDto' },
        },
        total: { type: 'number', example: 100 },
        totalPages: { type: 'number', example: 5 },
      },
    },
  })
  async getRevisions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(20), ParseIntPipe) size: number,
    @Query('sort', new DefaultValuePipe('createdAt,DESC')) sort: string,
  ): Promise<{
    data: RevisionResponseDto[];
    total: number;
    totalPages: number;
  }> {
    return this.revisionService.getRevisions(page, size, sort);
  }

  @Get(':revisionId')
  @ApiOperation({
    summary: '재평가 상세 조회',
    description: '특정 재평가의 상세 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '재평가 상세 정보가 성공적으로 조회되었습니다.',
    type: RevisionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '재평가를 찾을 수 없습니다.',
  })
  async getRevisionById(
    @Param('revisionId', ParseIntPipe) revisionId: number,
  ): Promise<RevisionResponseDto> {
    return this.revisionService.getRevisionById(revisionId);
  }
}
