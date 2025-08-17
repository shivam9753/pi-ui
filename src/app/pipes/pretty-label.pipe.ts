import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'prettyLabel',
  standalone: true,
})
export class PrettyLabelPipe implements PipeTransform {
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}
