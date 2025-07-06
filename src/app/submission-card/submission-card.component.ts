import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { PostTypeComponent } from '../utilities/post-type/post-type.component';
import { ReviewStatusComponent } from '../utilities/review-status/review-status.component';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-submission-card',
  imports: [DatePipe, PostTypeComponent, ReviewStatusComponent,DatePipe, CommonModule, RouterLink],
  templateUrl: './submission-card.component.html',
  styleUrl: './submission-card.component.css'
})
export class SubmissionCardComponent {
  @Input() submission: any;
  private router = inject(Router);
review(id: string) {
    this.router.navigate(['/review-submission', id]);
  }

  getBadgeClass(type: string): string {
    const normalizedType = type?.toLowerCase().trim();  // ← Normalize input
    switch (normalizedType) {
      case 'poem':
        return 'bg-purple-100 text-purple-800';
      case 'prose':
        return 'bg-blue-100 text-blue-800';
      case 'cinema_essay':
        return 'bg-red-100 text-red-800';
      case 'article':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  
  
}
