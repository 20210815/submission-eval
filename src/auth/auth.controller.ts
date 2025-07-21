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
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register new student' })
  @ApiBody({ type: SignupDto })
  @ApiResponse(API_RESPONSE_SCHEMAS.SIGNUP_SUCCESS)
  @ApiResponse(VALIDATION_ERROR_EXAMPLES)
  @ApiResponse(API_RESPONSE_SCHEMAS.CONFLICT)
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login student' })
  @ApiBody({ type: LoginDto })
  @ApiResponse(API_RESPONSE_SCHEMAS.LOGIN_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.UNAUTHORIZED)
  @ApiResponse(VALIDATION_ERROR_EXAMPLES)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, accessToken } = await this.authService.login(dto);
    res.header('Authorization', `Bearer ${accessToken}`);
    return response;
  }
}
