import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../students/entities/student.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { FutureApiResponse } from '../common/interfaces/api-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<FutureApiResponse> {
    const existing = await this.studentRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('이미 존재하는 이메일입니다');
    }

    const hashedPw = await bcrypt.hash(dto.password, 10);
    const student = this.studentRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPw,
    });
    await this.studentRepo.save(student);

    return ResponseUtil.createFutureApiResponse(
      '회원가입에 성공했습니다',
      student.id,
    );
  }

  async login(
    dto: LoginDto,
  ): Promise<{ response: FutureApiResponse; accessToken: string }> {
    const student = await this.studentRepo.findOne({
      where: { email: dto.email },
    });
    if (!student) throw new UnauthorizedException('사용자를 찾을 수 없습니다');

    const isMatch = await bcrypt.compare(dto.password, student.password);
    if (!isMatch)
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다');

    const payload = { sub: student.id, name: student.name };
    const token = await this.jwtService.signAsync(payload);

    return {
      response: ResponseUtil.createFutureApiResponse(
        '로그인에 성공했습니다',
        student.id,
      ),
      accessToken: token,
    };
  }
}
