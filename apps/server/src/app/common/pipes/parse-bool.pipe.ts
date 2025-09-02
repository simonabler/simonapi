import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseBoolPipe implements PipeTransform<string | boolean, boolean> {
  transform(value: string | boolean): boolean {
    if (typeof value === 'boolean') return value;
    const v = (value || '').toString().trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'n', 'off', ''].includes(v)) return false;
    throw new BadRequestException(`Invalid boolean: ${value}`);
  }
}

