import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'typeBadge',
  standalone: true
})
export class TypeBadgePipe implements PipeTransform {

  transform(submissionType: string, customColor?: string): string {
    if (customColor) {
      return `px-3 py-1 text-xs font-medium rounded-full text-white ${customColor}`;
    }
    
    // Default badge colors based on submission type with dark theme support
    const typeColors: { [key: string]: string } = {
      'article': 'bg-blue-500 dark:bg-blue-600',
      'cinema_essay': 'bg-purple-500 dark:bg-purple-600',
      'cinema essay': 'bg-purple-500 dark:bg-purple-600',
      'prose': 'bg-green-500 dark:bg-green-600',
      'poem': 'bg-orange-500 dark:bg-orange-600',
      'review': 'bg-red-500 dark:bg-red-600',
      'book_review': 'bg-teal-500 dark:bg-teal-600',
      'opinion': 'bg-yellow-500 dark:bg-yellow-600',
      'story': 'bg-indigo-500 dark:bg-indigo-600'
    };
    
    const colorClass = typeColors[submissionType?.toLowerCase()] || 'bg-orange-500 dark:bg-orange-600';
    return `px-3 py-1 text-xs font-medium rounded-full text-white dark:text-gray-100 ${colorClass}`;
  }
}