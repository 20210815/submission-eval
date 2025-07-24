import { IsEmail, IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Student name' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수입니다.' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Student email' })
  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Student password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8글자 이상이어야 합니다.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.',
  })
  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  password: string;
}
