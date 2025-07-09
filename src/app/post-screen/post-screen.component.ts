import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { BackendService } from '../backend.service';
// Types based on your DB models
interface User {
  _id: string;
  email: string;
  username: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Content {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: 'poem' | 'prose' | 'article' | 'cinema essay';
  wordCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Submission {
  _id: string;
  userId: string;
  title: string;
  description: string;
  contentIds: string[];
  status: string;
  reviewerId: string;
  reviewNotes: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  username: string,
  submissionType: 'poem' | 'prose' | 'article' | 'cinema essay';
  // Extended for display
  author?: User;
  contents?: Content[];
  headerImage?: string;
}

@Component({
  selector: 'app-post-screen',
  imports: [CommonModule, RouterModule],
  templateUrl: './post-screen.component.html',
  styleUrl: './post-screen.component.css'
})
export class PostScreenComponent {
  private activatedRoute = inject(ActivatedRoute);
  submission!: Submission;
  id:string = "";

constructor(private backendService: BackendService) {
  this.id = this.activatedRoute.snapshot.paramMap.get('id')!;
    if(this.id) {
      this.getSubmissionWithContents(this.id);
    }
}

getSubmissionWithContents(id: string) {
  this.backendService.getSubmissionWithContents(id).subscribe({
    next: (data: any) => {
      this.submission = data;
      console.log('Fetched submissions:', data);
    },
    error: (err:any) => {
      console.error('Error fetching submissions:', err);
    }
  });
  }

  ngOnInit() {
    // In a real app, you might fetch the submission data here
    // For demo purposes, we'll use the input
  }

  getPlaceholderClass(): string {
    return this.submission.submissionType.replace(' ', '-');
  }

  getTypeBadgeClass(): string {
    return this.submission.submissionType.replace(' ', '-');
  }

  getDisplayType(): string {
    switch (this.submission.submissionType) {
      case 'cinema essay':
        return 'Cinema Essay';
      default:
        return this.submission.submissionType.charAt(0).toUpperCase() + 
               this.submission.submissionType.slice(1);
    }
  }

  getAuthorInitials(): string {
    if (!this.submission.author?.username) return 'A';
    return this.submission.author.username
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  getReadTime(): number {
    const totalWords = this.submission.contents?.reduce((sum, content) => {
      return sum + (content.wordCount || 0);
    }, 0) || 0;
    return Math.ceil(totalWords / 200); // Average reading speed
  }

  shouldShowContentTitle(content: Content): boolean {
    // For poems, always show title
    if (content.type === 'poem') return true;
    
    // For single content submissions, don't show content title if it matches submission title
    if (this.submission.contents?.length === 1) {
      return content.title !== this.submission.title;
    }
    
    return true;
  }

  getContentClass(type: string): string {
    return type.replace(' ', '-');
  }

  formatContentBody(body: string): string {
    // Convert line breaks to HTML paragraphs
    return body.split('\n\n').map(paragraph => 
      `<p>${paragraph.replace(/\n/g, '<br>')}</p>`
    ).join('');
  }

  trackContent(index: number, content: Content): string {
    return content._id;
  }
}
