import { Pipe, PipeTransform } from '@angular/core';
import { getSubmissionTypeMapping } from '../shared/constants/submission-mappings';

@Pipe({
  name: 'typeBadge',
  standalone: true
})
export class TypeBadgePipe implements PipeTransform {

  transform(submissionType: string, customColor?: string): string {
    if (customColor) {
      return `px-3 py-1 text-xs font-medium rounded-full text-white ${customColor}`;
    }
    
    const mapping = getSubmissionTypeMapping(submissionType);
    return `px-3 py-1 text-xs font-medium rounded-full ${mapping.color}`;
  }
}