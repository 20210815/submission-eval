import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class KoreanParseIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException(['숫자 형태의 ID가 필요합니다.']);
    }
    return val;
  }
}
