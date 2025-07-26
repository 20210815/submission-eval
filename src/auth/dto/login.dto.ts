import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: '학생 이메일' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  email: string;

  @ApiProperty({
    example: 'mypassword123',
    description:
      '학생 비밀번호 (최소 8자 이상, 복잡도 요구사항 포함)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8글자 이상이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  password: string;
}
