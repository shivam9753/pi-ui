import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { BackendService } from '../../backend.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-review-submission',
  imports: [DatePipe, TitleCasePipe, CommonModule],
  templateUrl: './review-submission.component.html',
  styleUrl: './review-submission.component.css'
})
export class ReviewSubmissionComponent {
  id:string = "";
  private activatedRoute = inject(ActivatedRoute);
  submission: any;
  loggedInUser: any;

  constructor(private http: HttpClient, private backendService: BackendService, private authService: AuthService) {
    console.log("In review submission");
    this.id = this.activatedRoute.snapshot.paramMap.get('id')!;
    if(this.id) {
      this.getSubmissionWithContents(this.id);
    }
  }

  ngOnInit() {
    this.authService.user$.subscribe(data => {
      this.loggedInUser = data;
    });
  }

  getSubmissionWithContents(id: string) {
    this.http.get(`http://localhost:3000/api/submissions/${id}/contents`)
  .subscribe({
    next: (data: any) => {
      this.submission = data;
      console.log('Fetched submissions:', data);
    },
    error: (err:any) => {
      console.error('Error fetching submissions:', err);
    }
  });
  }

  approveSubmission(ev: any) {
    this.backendService.updateSubmissionStatus(this.id, {
      status: 'accepted',
      reviewerId: this.loggedInUser.id,
      reviewNotes: 'Strong piece, well done.'
    }).subscribe({
      next: (res) => {
        console.log('Submission approved:', res);
      },
      error: (err) => {
        console.error('Error updating submission:', err);
      }
    });
  }

  rejectSubmission(id: string) {
    this.backendService.updateSubmissionStatus(id, {
      status: 'rejected',
      reviewerId: '64fa2222abcde4444abcd111',
      reviewNotes: 'Needs better flow.'
    }).subscribe({
      next: (res) => {
        console.log('Submission rejected:', res);
      },
      error: (err) => {
        console.error('Error rejecting submission:', err);
      }
    });
  }
  
}
