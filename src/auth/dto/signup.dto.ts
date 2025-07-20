import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Student name' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수입니다.' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Student email' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Student password',
    minLength: 4,
  })
  @IsString()
  @MinLength(4, { message: '비밀번호는 최소 4글자 이상이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  password: string;
}
