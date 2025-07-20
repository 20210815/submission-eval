import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { API_RESPONSE_SCHEMAS } from '../common/constants/api-response-schemas';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register new student' })
  @ApiBody({ type: SignupDto })
  @ApiResponse(API_RESPONSE_SCHEMAS.SIGNUP_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.BAD_REQUEST)
  @ApiResponse(API_RESPONSE_SCHEMAS.CONFLICT)
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login student' })
  @ApiBody({ type: LoginDto })
  @ApiResponse(API_RESPONSE_SCHEMAS.LOGIN_SUCCESS)
  @ApiResponse(API_RESPONSE_SCHEMAS.UNAUTHORIZED)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    res.cookie('token', result.data?.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return result;
  }
}
