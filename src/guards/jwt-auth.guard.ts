import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

type AuthUser = { userId: number; name: string };

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser>(err: any, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    return user;
  }
}
