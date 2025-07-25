import {
  IsString,
  IsNotEmpty,
  ValidateBy,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function IsEmailRequired(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isEmailRequired',
      validator: {
        validate: (value: string) => {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return false;
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        defaultMessage: (args?: ValidationArguments) => {
          const value = args?.value as string;
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return '이메일은 필수입니다.';
          }
          return '이메일 형식이 올바르지 않습니다';
        },
      },
    },
    validationOptions,
  );
}

function IsPasswordRequired(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isPasswordRequired',
      validator: {
        validate: (value: string) => {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return false;
          }
          return value.length >= 8;
        },
        defaultMessage: (args?: ValidationArguments) => {
          const value = args?.value as string;
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return '비밀번호는 필수입니다.';
          }
          return '비밀번호는 최소 8글자 이상이어야 합니다.';
        },
      },
    },
    validationOptions,
  );
}

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Student name' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수입니다.' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Student email' })
  @IsString()
  @IsEmailRequired()
  email: string;

  @ApiProperty({
    example: 'mypassword123',
    description: '비밀번호 (최소 8글자 이상)',
    minLength: 8,
  })
  @IsString()
  @IsPasswordRequired()
  password: string;
}
