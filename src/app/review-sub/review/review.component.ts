
import { Component, Input } from '@angular/core';
import { SubmissionCardComponent } from '../../submission-card/submission-card.component';
import { BackendService } from '../../backend.service';
import { QuickFilterComponent, QuickFilterOption } from '../../quick-filter/quick-filter.component';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-review',
  imports: [SubmissionCardComponent, QuickFilterComponent, DatePipe, TitleCasePipe, CommonModule],
  templateUrl: './review.component.html',
  styleUrl: './review.component.css'
})
export class ReviewCpomponent {
  submissions: any;
  selectedType: string = '';

  filterOptions: any = [
    { label: 'All', value: '' },
    { label: 'Poem', value: 'poem' },
    { label: 'Prose', value: 'prose' },
    { label: 'Cinema Essay', value: 'cinema_essay' },
    { label: 'Article', value: 'article' }
  ];

  constructor(private backendService: BackendService) {
    this.getSubmissions(); // Default fetch all
  }

  getSubmissions(type: string = '') {
    this.selectedType = type;
    this.backendService.getSubmissions(type).subscribe(
      (data) => (this.submissions = data),
      (error) => console.error("Error fetching submissions", error)
    );
  }

  onFilterChange(type: string) {
    this.getSubmissions(type);
  }
}
