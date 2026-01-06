import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Draft, SubmissionMode, SubmitFormComponent } from '../../main-submission/submit-form/submit-form.component';
import { DraftsListComponent } from '../../main-submission/drafts-list/drafts-list.component';
import { GuidelinesOverlayComponent } from '../../main-submission/guidelines-overlay/guidelines-overlay.component';
import { ToastNotificationComponent } from '../../shared/components';
import { AuthService, GoogleUser } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';

@Component({
  selector: 'app-submission-editor',
  templateUrl: './submission-editor.component.html',
  styleUrls: ['./submission-editor.component.css'],
  imports: [
    CommonModule,
    SubmitFormComponent,
    DraftsListComponent,
    GuidelinesOverlayComponent,
    ToastNotificationComponent
  ]
})
export class SubmissionEditorComponent implements OnInit, OnDestroy {
  mode: SubmissionMode = 'create';
  submissionId?: string;
  activeTab: 'submit' | 'drafts' | 'guidelines' = 'submit';
  loggedInUser: GoogleUser | null = null;

  drafts: Draft[] = [];
  currentDraft: Draft | null = null;
  relatedTopicPitchId: string | null = null;
  private topicPitchData: { title?: string; description?: string; type?: string } | null = null;
  private subscriptions: Subscription[] = [];

  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' | 'warning' = 'info';
  showToastFlag = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private backendService: BackendService
  ) {}

  ngOnInit(): void {
    // Get user data
    this.authService.user$.subscribe(user => {
      this.loggedInUser = user;
    });

    // Determine mode from route params and query params
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.submissionId = params['id'];
        this.mode = 'edit'; // Default to edit, will be refined by query params
      }
    });

    this.route.queryParams.subscribe(queryParams => {
      const action = queryParams['action'];
      const mode = queryParams['mode'];

      if (action === 'resubmit' || mode === 'resubmit') {
        this.mode = 'resubmit';
      } else if (action === 'view' || mode === 'view') {
        this.mode = 'view';
      } else if (queryParams['draft']) {
        this.mode = 'create';
        this.loadSpecificDraft(queryParams['draft']);
      } else if (queryParams['topicId']) {
        // Handle topic pitch parameters
        this.mode = 'create';
        this.handleTopicPitchParams(queryParams);
      }
    });

    // Load drafts for create mode
    if (this.mode === 'create') {
      this.loadDrafts();
    }
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
          ? '✨ Writing based on a community topic pitch - form pre-filled for you!'
          : 'Send us your work for consideration';
      case 'edit': return 'Update your submission and resubmit';
      case 'resubmit': return 'Make revisions and resubmit for review';
      case 'view': return 'Review your submission';
      default: return '';
    }
  }

  // Draft Management
  loadDrafts(): void {
    if (this.mode !== 'create') return;

    this.backendService.getUserDrafts().subscribe({
      next: (response) => {
        this.drafts = (response.drafts || []).map((draft: any) => ({
          id: draft.id || draft._id,
          title: draft.title || 'Untitled Draft',
          submissionType: draft.type || draft.submissionType,
          contents: draft.contents || [],
          description: draft.excerpt || '',
          lastModified: new Date(draft.lastEditedAt || draft.updatedAt || draft.createdAt),
          wordCount: draft.wordCount || 0
        }));
      },
      error: () => {
        this.drafts = [];
      }
    });
  }

  loadSpecificDraft(draftId: string): void {
    const draft = this.drafts.find(d => d.id === draftId);
    if (draft) {
      this.currentDraft = draft;
      this.activeTab = 'submit';
    } else {
      this.backendService.getUserDrafts().subscribe({
        next: (response) => {
          const apiDraft = (response.drafts || []).find((d: any) => d.id === draftId || d._id === draftId);
          if (apiDraft) {
            const transformedDraft: Draft = {
              id: apiDraft._id,
              title: apiDraft.title,
              submissionType: apiDraft.submissionType,
              contents: apiDraft.contents || [],
              description: apiDraft.description,
              lastModified: apiDraft.lastEditedAt,
              wordCount: apiDraft.wordCount || 0
            };
            this.currentDraft = transformedDraft;
            this.activeTab = 'submit';
          }
        },
        error: () => {
          this.showToast('Draft not found', 'error');
        }
      });
    }
  }

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

    // Show notification
    setTimeout(() => {
      this.showToast('Pre-filled from topic pitch! Feel free to modify as needed.', 'info');
    }, 100);
  }

  loadDraftAndSwitchToSubmit(draft: Draft): void {
    this.currentDraft = draft;
    this.activeTab = 'submit';
    this.showToast('Draft loaded successfully!', 'success');
  }

  deleteDraft(draftId: string): void {
    this.backendService.deleteDraft(draftId).subscribe({
      next: () => {
        this.showToast('Draft deleted successfully', 'success');
        this.loadDrafts();
      },
      error: (error) => {
        let errorMessage = 'Failed to delete draft. Please try again.';

        if (error.status === 0) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.status === 401) {
          errorMessage = 'Please log in again to delete your draft.';
        } else if (error.status === 404) {
          errorMessage = 'Draft not found. It may have already been deleted.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again in a few minutes.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast(errorMessage, 'error');
      }
    });
  }

  onDraftSaved(draftId: string): void {
    this.loadDrafts();
  }

  onFormSubmitted(): void {
    setTimeout(() => {
      this.router.navigate([this.mode === 'create' ? '/explore' : '/user-profile']);
    }, 2000);
  }

  onFormCancelled(): void {
    this.router.navigate(['/user-profile']);
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
