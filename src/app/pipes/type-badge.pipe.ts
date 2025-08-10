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
    
    // Default badge colors based on submission type
    const typeColors: { [key: string]: string } = {
      'article': 'bg-blue-500',
      'cinema_essay': 'bg-purple-500',
      'cinema essay': 'bg-purple-500',
      'prose': 'bg-green-500',
      'poem': 'bg-orange-500',
      'review': 'bg-red-500',
      'book_review': 'bg-teal-500',
      'opinion': 'bg-yellow-500',
      'quote': 'bg-pink-500',
      'story': 'bg-indigo-500'
    };
    
    const colorClass = typeColors[submissionType?.toLowerCase()] || 'bg-orange-500';
    return `px-3 py-1 text-xs font-medium rounded-full text-white ${colorClass}`;
  }
}