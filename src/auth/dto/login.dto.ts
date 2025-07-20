import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  email: string;

  @IsString()
  @MinLength(4, { message: '비밀번호는 최소 4글자 이상이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  password: string;
}
