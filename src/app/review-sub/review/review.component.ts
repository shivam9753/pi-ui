
import { Component,  OnInit } from '@angular/core';
import { SubmissionCardComponent } from '../../submission-card/submission-card.component';
import { BackendService } from '../../backend.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-review',
  imports: [SubmissionCardComponent, CommonModule],
  templateUrl: './review.component.html',
  styleUrl: './review.component.css'
})
export class ReviewCpomponent implements OnInit {
  submissions: any[] = [];
  selectedType: string = '';

  filterOptions: any = [
    { label: 'All', value: '' },
    { label: 'Poem', value: 'poem' },
    { label: 'Prose', value: 'prose' },
    { label: 'Cinema Essay', value: 'cinema_essay' },
    { label: 'Article', value: 'article' }
  ];

  constructor(private backendService: BackendService) {
    
  }

  ngOnInit() {
      this.getSubmissions();
  }

  getSubmissions(type: string = '') {
    this.selectedType = type;
    this.backendService.getPendingSubmissions(type).subscribe(
      (data) => (this.submissions = data.submissions),
      (error) => console.error("Error fetching submissions", error)
    );
  }

  onFilterChange(type: string) {
    this.getSubmissions(type);
  }
}
