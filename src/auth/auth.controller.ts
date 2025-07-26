import { Controller, Post, Body, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  API_RESPONSE_SCHEMAS,
  VALIDATION_ERROR_EXAMPLES,
} from '../common/constants/api-response-schemas';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: '학생 회원가입',
    description: `
      학생 회원가입 API:
      - 이메일 중복 체크
      - 비밀번호 보안 정책 적용 (최소 8글자 이상)
      - 회원가입 성공 시
      - 에러 처리 및 유효성 검사 적용
    `,
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse(API_RESPONSE_SCHEMAS.SIGNUP_SUCCESS)
  @ApiResponse(VALIDATION_ERROR_EXAMPLES)
  @ApiResponse(API_RESPONSE_SCHEMAS.CONFLICT)
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '학생 로그인',
    description: `
      학생 로그인 API:
      - JWT 토큰 만료 검증
      - 보안을 위한 HttpOnly 쿠키 설정
      - SameSite=Strict 보호
      - 자동 토큰 갱신 처리
    `,
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse(API_RESPONSE_SCHEMAS.LOGIN_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.UNAUTHORIZED)
  @ApiResponse(VALIDATION_ERROR_EXAMPLES)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, accessToken } = await this.authService.login(dto);

    // Set Authorization header
    res.header('Authorization', `Bearer ${accessToken}`);

    return response;
  }
}
