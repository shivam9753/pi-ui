import { Injectable, signal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface SubmissionData {
  id: number;
  type: string;
  title: string;
  content: string;
  tags: string[];
  description: string;
  submittedAt: Date;
  status: 'pending_review' | 'approved' | 'rejected';
}

@Injectable({
  providedIn: 'root'
})
export class ContentSubmissionService {
  private submissions = signal<SubmissionData[]>([]);

  getSubmissions() {
    return this.submissions.asReadonly();
  }

  submitContent(submissions: any[]): Observable<{ success: boolean; message: string }> {
    // Simulate API call
    const submissionData: SubmissionData[] = submissions.map(sub => ({
      ...sub,
      submittedAt: new Date(),
      status: 'pending_review' as const
    }));

    // Add to local storage or send to backend
    this.submissions.update(current => [...current, ...submissionData]);

    return of({ 
      success: true, 
      message: `Successfully submitted ${submissions.length} item(s)` 
    }).pipe(delay(1000));
  }

  getDraftSubmissions(): Observable<any[]> {
    // Simulate getting drafts from local storage
    const drafts = JSON.parse(localStorage.getItem('contentDrafts') || '[]');
    return of(drafts);
  }

  saveDraft(submission: any): void {
    const drafts = JSON.parse(localStorage.getItem('contentDrafts') || '[]');
    const existingIndex = drafts.findIndex((d: any) => d.id === submission.id);
    
    if (existingIndex >= 0) {
      drafts[existingIndex] = submission;
    } else {
      drafts.push(submission);
    }
    
    localStorage.setItem('contentDrafts', JSON.stringify(drafts));
  }

  deleteDraft(id: number): void {
    const drafts = JSON.parse(localStorage.getItem('contentDrafts') || '[]');
    const filtered = drafts.filter((d: any) => d.id !== id);
    localStorage.setItem('contentDrafts', JSON.stringify(filtered));
  }
}