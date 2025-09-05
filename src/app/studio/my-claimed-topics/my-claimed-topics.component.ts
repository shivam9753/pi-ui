import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TopicPitch } from '../../models';
import { AuthService } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { RichTextEditorComponent } from '../../submit/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-my-claimed-topics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RichTextEditorComponent],
  templateUrl: './my-claimed-topics.component.html',
  styleUrl: './my-claimed-topics.component.css'
})
export class MyClaimedTopicsComponent implements OnInit {
  claimedTopics: TopicPitch[] = [];
  loading = false;
  currentUser: any;
  selectedTopic: TopicPitch | null = null;
  draftContent: string = '';
  savingDraft = false;
  loadingDraft = false;
  draftId: string | null = null;
  topicsWithDrafts = new Set<string>();
  showMobileEditor = false;
  showTopicDescription = true;

  constructor(
    private authService: AuthService,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadClaimedTopics();
  }

  loadClaimedTopics() {
    this.loading = true;
    
    // Get topics claimed by current user - just filter by status on frontend
    const queryParams = {
      status: 'claimed'
    };

    this.backendService.get<any>('/topic-pitches', queryParams).subscribe({
      next: (response: any) => {
        // Filter topics claimed by current user using the correct user ID
        const currentUserId = this.currentUser?.id || this.currentUser?._id;
        console.log('Current user ID:', currentUserId);
        console.log('All claimed topics:', response.topics);
        
        this.claimedTopics = response.topics?.filter((topic: TopicPitch) => {
          console.log('Comparing topic.claimedBy:', topic.claimedBy, 'with user ID:', currentUserId);
          return topic.claimedBy === currentUserId;
        }) || [];
        
        console.log('Filtered claimed topics:', this.claimedTopics);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading claimed topics:', error);
        this.loading = false;
      }
    });
  }

  selectTopic(topic: TopicPitch) {
    this.selectedTopic = topic;
    this.draftContent = '';
    this.draftId = null;
    // TODO: Load existing draft if any
    this.loadExistingDraft(topic);
  }

  loadExistingDraft(topic: TopicPitch) {
    // Only load draft if we don't already know this topic has a draft
    console.log('Checking for existing draft for topic:', topic._id);
    this.loadingDraft = true;
    
    // Quick check: if we already have this topic marked as having a draft, skip the API call
    if (this.topicsWithDrafts.has(topic._id)) {
      console.log('Topic already marked as having draft, skip duplicate API call');
      this.loadingDraft = false;
      return;
    }
    
    this.backendService.get<any>('/submissions/drafts/my').subscribe({
      next: (response: any) => {
        console.log('User drafts for topic selection:', response.drafts);
        
        // Try to find a draft that matches this topic
        const topicDraft = response.drafts?.find((draft: any) => 
          draft.description?.includes(`Draft for claimed topic: ${topic.title}`) ||
          draft.title?.includes(topic.title)
        );
        
        if (topicDraft) {
          console.log('Found existing draft for topic:', topicDraft);
          this.draftId = topicDraft.id;
          this.topicsWithDrafts.add(topic._id); // Mark this topic as having a draft
          this.loadDraftContent(topicDraft.id);
        } else {
          console.log('No existing draft found for this topic');
          this.loadingDraft = false;
        }
      },
      error: (error: any) => {
        console.error('Error loading user drafts:', error);
        this.loadingDraft = false;
      }
    });
  }

  loadDraftContent(draftId: string) {
    // Load the full draft content with contents
    this.backendService.get<any>(`/submissions/${draftId}/contents`).subscribe({
      next: (response: any) => {
        console.log('Draft content API response:', response);
        
        // Try multiple possible response structures
        let contentBody = '';
        
        // Try structure 1: response.submission.contentIds[0].body
        if (response.submission?.contentIds && response.submission.contentIds.length > 0) {
          const firstContent = response.submission.contentIds[0];
          if (firstContent?.body) {
            contentBody = firstContent.body;
            console.log('Found content via contentIds structure');
          }
        }
        
        // Try structure 2: response.contents[0].body  
        if (!contentBody && response.contents && response.contents.length > 0) {
          const firstContent = response.contents[0];
          if (firstContent?.body) {
            contentBody = firstContent.body;
            console.log('Found content via contents array structure');
          }
        }
        
        // Try structure 3: direct response.body
        if (!contentBody && response.body) {
          contentBody = response.body;
          console.log('Found content via direct body structure');
        }
        
        if (contentBody) {
          this.draftContent = contentBody;
          console.log('✅ Draft content set successfully:', this.draftContent.substring(0, 100) + '...');
        } else {
          console.warn('❌ No draft content found in API response. Response structure:', Object.keys(response));
          // Try alternative: load from drafts/my endpoint which includes content
          this.loadDraftContentFromDraftsAPI(draftId);
          return;
        }
        
        this.loadingDraft = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading draft content from /submissions/${draftId}/contents:', error);
        // Try alternative approach
        this.loadDraftContentFromDraftsAPI(draftId);
      }
    });
  }
  
  loadDraftContentFromDraftsAPI(draftId: string) {
    console.log('🔄 Trying alternative: load from drafts/my endpoint');
    
    this.backendService.get<any>('/submissions/drafts/my').subscribe({
      next: (response: any) => {
        console.log('Drafts/my API response:', response);
        
        const targetDraft = response.drafts?.find((draft: any) => draft.id === draftId);
        
        if (targetDraft) {
          console.log('Found target draft:', targetDraft);
          
          // Try to extract content from the draft object
          if (targetDraft.contents && targetDraft.contents.length > 0) {
            const firstContent = targetDraft.contents[0];
            if (firstContent?.body) {
              this.draftContent = firstContent.body;
              console.log('✅ Draft content loaded from drafts/my endpoint');
            }
          } else if (targetDraft.body) {
            this.draftContent = targetDraft.body;
            console.log('✅ Draft content loaded from direct body in drafts/my');
          } else {
            console.warn('❌ No content found in draft object either');
          }
        } else {
          console.warn('❌ Draft not found in drafts/my response');
        }
        
        this.loadingDraft = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading from drafts/my endpoint too:', error);
        this.loadingDraft = false;
      }
    });
  }

  saveDraft() {
    if (!this.selectedTopic || !this.draftContent.trim()) return;
    
    this.savingDraft = true;
    
    // Prepare draft data for the API
    const draftData = {
      title: `${this.selectedTopic.title} - Draft`,
      description: `Draft for claimed topic: ${this.selectedTopic.title}`,
      submissionType: this.selectedTopic.contentType,
      contents: [{
        title: this.selectedTopic.title,
        body: this.draftContent,
        type: this.selectedTopic.contentType,
        tags: this.selectedTopic.tags || []
      }],
      ...(this.draftId && { draftId: this.draftId }),
      // Add topic pitch reference in description for now
      topicPitchId: this.selectedTopic._id
    };

    console.log('Saving draft with data:', draftData);

    this.backendService.post('/submissions/drafts', draftData).subscribe({
      next: (response: any) => {
        console.log('Draft saved successfully:', response);
        this.savingDraft = false;
        
        // Store the draft ID for future updates
        if (response.draft?.id) {
          this.draftId = response.draft.id;
        }
        
        // Add this topic to the drafts set
        if (this.selectedTopic) {
          this.topicsWithDrafts.add(this.selectedTopic._id);
        }
        
        // Show success feedback to user
        this.showSuccessMessage('Draft saved successfully!');
      },
      error: (error: any) => {
        console.error('Error saving draft:', error);
        this.savingDraft = false;
        this.showErrorMessage('Failed to save draft. Please try again.');
      }
    });
  }

  private showSuccessMessage(message: string) {
    // Simple success feedback - could be enhanced with a toast/notification service
    console.log('✅ Success:', message);
    // TODO: Implement proper user feedback (toast notification)
  }

  private showErrorMessage(message: string) {
    // Simple error feedback - could be enhanced with a toast/notification service
    console.error('❌ Error:', message);
    // TODO: Implement proper user feedback (toast notification)
  }

  unclaimTopic(topic: TopicPitch) {
    if (!confirm(`Are you sure you want to unclaim "${topic.title}"? Any unsaved work will be lost.`)) {
      return;
    }

    this.backendService.post(`/topic-pitches/${topic._id}/unclaim`, {}).subscribe({
      next: () => {
        this.loadClaimedTopics(); // Refresh the list
        if (this.selectedTopic?._id === topic._id) {
          this.selectedTopic = null;
          this.draftContent = '';
        }
      },
      error: (error: any) => {
        console.error('Error unclaiming topic:', error);
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return this.formatDate(dateString);
  }

  isDeadlineApproaching(topic: TopicPitch): boolean {
    if (!topic.userDeadline) return false;
    
    const deadline = new Date(topic.userDeadline);
    const now = new Date();
    const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffInDays <= 3 && diffInDays >= 0;
  }

  isDeadlineOverdue(topic: TopicPitch): boolean {
    if (!topic.userDeadline) return false;
    
    const deadline = new Date(topic.userDeadline);
    const now = new Date();
    
    return deadline.getTime() < now.getTime();
  }


  hasDraft(topicId: string): boolean {
    return this.topicsWithDrafts.has(topicId);
  }

  openMobileEditor(topic: TopicPitch) {
    this.selectedTopic = topic;
    this.draftContent = '';
    this.draftId = null;
    this.showMobileEditor = true;
    this.showTopicDescription = true;
    // Load existing draft if any
    this.loadExistingDraft(topic);
  }

  closeMobileEditor() {
    this.showMobileEditor = false;
    this.selectedTopic = null;
    this.draftContent = '';
    this.draftId = null;
  }
}