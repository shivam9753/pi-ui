import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ViewTrackerService } from '../services/view-tracker.service';
import { ContentCardComponent, ContentCardData } from '../shared/components/content-card/content-card.component';
import { ButtonComponent } from '../shared/components';

@Component({
  selector: 'app-submission-success',
  standalone: true,
  imports: [CommonModule, ContentCardComponent, ButtonComponent, RouterModule],
  templateUrl: './submission-success.component.html',
  styleUrls: ['./submission-success.component.css']
})
export class SubmissionSuccessComponent implements OnInit {
  posts: ContentCardData[] = [];
  loading = true;

  constructor(private router: Router, private viewTrackerService: ViewTrackerService) {}

  ngOnInit(): void {
    // Load trending / popular posts to show to the user (12 items)
    this.viewTrackerService.getTrendingPosts(12, 0).subscribe({
      next: (data) => {
        this.posts = data.submissions || [];
        this.loading = false;
      },
      error: () => {
        this.posts = [];
        this.loading = false;
      }
    });
  }

  goToMySubmissions(): void {
    this.router.navigate(['/my-submissions']);
  }

  goToExplore(): void {
    this.router.navigate(['/explore']);
  }
}
