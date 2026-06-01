import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, GoogleUser } from '../services/auth.service';
import { GuidelinesOverlayComponent } from './guidelines-overlay/guidelines-overlay.component';
import { ToastNotificationComponent } from '../shared/components/toast-notification/toast-notification.component';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-submission-editor',
  templateUrl: './submission-editor.component.html',
  styleUrls: ['./submission-editor.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    GuidelinesOverlayComponent,
    ToastNotificationComponent,
    MatButtonModule,
    MatTabsModule
  ]
})
export class SubmissionEditorComponent implements OnInit, OnDestroy {
  mode: 'create' | 'edit' | 'resubmit' | 'view' = 'create';
  submissionId?: string;
  activeTab: 'submit' | 'guidelines' = 'submit'; // Cleaned up 'drafts'
  loggedInUser: GoogleUser | null = null;

  relatedTopicPitchId: string | null = null;
  private topicPitchData: { title?: string; description?: string; type?: string } | null = null;
  private subscriptions: Subscription[] = [];

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' | 'warning' = 'info';
  showToastFlag = false;

  constructor(
    private router: Router,
    public route: ActivatedRoute,
    private authService: AuthService
  ) {}

  // Updated to include only our two active tabs
  readonly tabIds: ('submit' | 'guidelines')[] = ['submit', 'guidelines'];

  get selectedTabIndex(): number {
    return Math.max(0, this.tabIds.indexOf(this.activeTab));
  }

  onTabIndexChange(index: number) {
    const tab = this.tabIds[index];
    if (!tab) return;

    this.activeTab = tab;
  }

  ngOnInit(): void {
    // Get user data
    this.authService.user$.subscribe(user => {
      this.loggedInUser = user;
    });

    // Determine mode from route params and query params
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.submissionId = params['id'];
        this.mode = 'edit';
      }
    });

    this.route.queryParams.subscribe(queryParams => {
      const action = queryParams['action'];
      const mode = queryParams['mode'];

      if (action === 'resubmit' || mode === 'resubmit') {
        this.mode = 'resubmit';
      } else if (action === 'view' || mode === 'view') {
        this.mode = 'view';
      } else if (queryParams['topicId']) {
        this.mode = 'create';
        this.handleTopicPitchParams(queryParams);
      }
    });
  }

  // Mode-based getters
  get isCreateMode(): boolean { return this.mode === 'create'; }

  get pageTitle(): string {
    switch (this.mode) {
      case 'create': return 'Submit Your Work';
      case 'edit': return 'Edit Your Submission';
      case 'resubmit': return 'Resubmit Your Work';
      case 'view': return 'View Submission';
      default: return 'Submission Editor';
    }
  }

  get pageSubtitle(): string {
    switch (this.mode) {
      case 'create':
        return this.relatedTopicPitchId
          ? '✨ Writing based on a community topic pitch - details pre-filled for you!'
          : 'Send us your work for consideration';
      case 'edit': return 'Update your submission details';
      case 'resubmit': return 'Make revisions and follow up';
      case 'view': return 'Review your submission details';
      default: return '';
    }
  }

  get isViewMode(): boolean { return this.mode === 'view'; }

  handleTopicPitchParams(queryParams: any): void {
    const { topicId, title, type, description } = queryParams;

    if (topicId) {
      this.relatedTopicPitchId = topicId;
    }

    this.topicPitchData = {
      title: title || undefined,
      description: description || undefined,
      type: type || undefined
    };

    setTimeout(() => {
      this.showToast('Pre-filled from topic pitch! See guidelines for email submission.', 'info');
    }, 100);
  }

  onToastMessage(event: { message: string; type: 'success' | 'error' | 'info' | 'warning' }): void {
    this.showToast(event.message, event.type);
  }

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;
  }

  hideToast(): void {
    this.showToastFlag = false;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}