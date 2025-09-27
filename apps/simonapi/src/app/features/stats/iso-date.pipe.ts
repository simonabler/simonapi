import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'isoDate', standalone: true })
export class IsoDatePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString();
  }
}
