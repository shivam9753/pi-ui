// explore.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { BackendService } from '../backend.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-explore',
  imports: [DatePipe, TitleCasePipe, CommonModule, RouterLink],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css'
})
export class ExploreComponent implements OnInit {
  submissions: any[] = [];
  selectedType: string = '';
  
  filterOptions: any = [
    { label: 'All', value: '' },
    { label: 'Poem', value: 'poem' },
    { label: 'Prose', value: 'prose' },
    { label: 'Cinema Essay', value: 'cinema_essay' },
    { label: 'Article', value: 'article' }
  ];

  constructor(private backendService: BackendService, private router: Router) {}

  ngOnInit() {
      this.getPublishedSubmissions();
  }

  getPublishedSubmissions(type: string = '') {
    this.selectedType = type;
    this.backendService.getSubmissions(type, 'published').subscribe(
      (data) => (this.submissions = data.submissions || []),
      (error) => console.error("Error fetching submissions", error)
    );
  }

  onFilterChange(type: string) {
    this.getPublishedSubmissions(type);
  }

  openSubmission(submission: any) {
    // Navigate to the reading interface with submission ID
    this.router.navigate(['/read', submission._id]);
  }
}