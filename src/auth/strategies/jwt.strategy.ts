// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {
    // 환경 변수 없을 때 예외처리
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET 환경 변수가 설정되어 있지 않습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser | null> {
    // 토큰 만료 시간 추가 검증
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    const student = await this.studentRepo.findOne({
      where: { id: payload.sub },
      // 추가 필드가 있다면 select로 필요한 것만 조회하여 성능 개선
      select: ['id', 'name', 'email'],
    });

    if (!student) {
      return null;
    }

    // 계정이 존재하고 유효한 경우에만 인증된 사용자 정보 반환
    return {
      sub: student.id,
      name: student.name,
      email: student.email,
    };
  }
}
