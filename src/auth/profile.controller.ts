import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('profile')
export class ProfileController {
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getProfile(@Req() req: RequestWithUser) {
    return {
      id: req.user.userId,
      name: req.user.name,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: RequestWithUser) {
    return req.user; // 자동완성됨!
  }
}
