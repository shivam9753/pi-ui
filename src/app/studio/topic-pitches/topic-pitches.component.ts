import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TopicPitch, CreateTopicPitchPayload, TopicPitchFilters, TopicPitchesResponse } from '../../models';
import { AuthService } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { ButtonComponent } from '../../shared/components';

@Component({
  selector: 'app-topic-pitches',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './topic-pitches.component.html',
  styleUrl: './topic-pitches.component.css'
})
export class TopicPitchesComponent implements OnInit {
  topics: TopicPitch[] = [];
  loading = false;
  showCreateForm = false;
  createForm: FormGroup;
  currentUser: any;
  
  // Filter properties
  filters: TopicPitchFilters = {};
  statusFilter = 'all';
  typeFilter = 'all';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  limit = 10;

  // Expanded topics tracking
  expandedTopics = new Set<string>();

  // Claiming modal state
  showClaimModal = false;
  topicToCliam: TopicPitch | null = null;
  claimDeadline = '';
  claimingInProgress = false;

  // Contributors (writers, reviewers, admins)
  contributors: any[] = [];
  contributorsLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private backendService: BackendService,
    private router: Router
  ) {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      contentType: ['article', Validators.required],
      priority: ['medium'],
      deadline: [''],
      tags: ['']
    });
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadTopics();
    this.loadContributors();
  }

  loadTopics() {
    this.loading = true;
    const queryParams = {
      ...this.filters,
      limit: this.limit,
      skip: (this.currentPage - 1) * this.limit
    };

    // Apply filters
    if (this.statusFilter !== 'all') {
      queryParams.status = this.statusFilter;
    }
    if (this.typeFilter !== 'all') {
      queryParams.contentType = this.typeFilter;
    }

    this.backendService.get<TopicPitchesResponse>('/topic-pitches', queryParams).subscribe({
      next: (response: TopicPitchesResponse) => {
        this.topics = response.topics || [];
        this.totalPages = Math.ceil((response.pagination?.total || 0) / this.limit);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading topics:', error);
        this.loading = false;
      }
    });
  }

  loadContributors() {
    this.contributorsLoading = true;
    
    // Load contributors with elevated roles (writer, reviewer, admin)
    forkJoin({
      writers: this.backendService.getUsers({ role: 'writer', limit: 50 }),
      reviewers: this.backendService.getUsers({ role: 'reviewer', limit: 50 }),
      admins: this.backendService.getUsers({ role: 'admin', limit: 50 })
    }).subscribe({
      next: (responses) => {
        // Combine all users from different roles
        const allUsers = [
          ...(responses.writers.users || []),
          ...(responses.reviewers.users || []),
          ...(responses.admins.users || [])
        ];
        
        // Remove duplicates based on user ID (in case a user has multiple roles)
        const uniqueUsers = allUsers.filter((user, index, self) => 
          index === self.findIndex(u => u._id === user._id)
        );
        
        // Sort by name
        this.contributors = uniqueUsers.sort((a, b) => {
          const nameA = (a.name || a.username || 'Unknown').toLowerCase();
          const nameB = (b.name || b.username || 'Unknown').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        this.contributorsLoading = false;
      },
      error: (error) => {
        console.error('Error loading contributors:', error);
        this.contributors = [];
        this.contributorsLoading = false;
      }
    });
  }

  onCreateTopic() {
    if (this.createForm.valid) {
      const payload: CreateTopicPitchPayload = {
        ...this.createForm.value,
        tags: this.createForm.value.tags ? this.createForm.value.tags.split(',').map((tag: string) => tag.trim()) : []
      };

      this.backendService.post('/topic-pitches', payload).subscribe({
        next: () => {
          this.showCreateForm = false;
          this.createForm.reset({ contentType: 'article', priority: 'medium' });
          this.loadTopics();
        },
        error: (error: any) => {
          console.error('Error creating topic:', error);
        }
      });
    }
  }


  onWriteOnTopic(topic: TopicPitch) {
    // Navigate to submission editor with topic pre-filled
    const queryParams = {
      topicId: topic._id,
      title: topic.title,
      type: topic.contentType,
      description: topic.description
    };
    
    this.router.navigate(['/submission'], { queryParams });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadTopics();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadTopics();
  }

  canClaimTopic(topic: TopicPitch): boolean {
    return topic.status === 'available';
  }

  canEditTopic(topic: TopicPitch): boolean {
    return topic.pitchedBy === this.currentUser?._id || this.currentUser?.role === 'admin';
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'claimed': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-purple-600 bg-purple-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getTopicCountByStatus(status: string): number {
    return this.topics.filter(topic => topic.status === status).length;
  }

  getRecentActivity(): TopicPitch[] {
    return this.topics
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }

  getActivityIcon(status: string): string {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'claimed': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  }

  getActivityText(topic: TopicPitch): string {
    switch (topic.status) {
      case 'available':
        return `Pitched by ${this.formatUserName(topic.pitcherName)}`;
      case 'claimed':
        return `Claimed by ${this.formatUserName(topic.claimedByName) || 'Unknown'}`;
      case 'completed':
        return `Completed by ${this.formatUserName(topic.claimedByName) || 'Unknown'}`;
      case 'cancelled':
        return `Cancelled`;
      default:
        return `Status: ${topic.status}`;
    }
  }

  formatUserName(name: string | undefined | null): string {
    if (!name) return '';
    
    // If it looks like a generated username (has numbers at the end), format it
    if (name.includes('_') && /\d+$/.test(name)) {
      return name.replace(/_\d+$/, '').replace(/_/g, ' ');
    }
    
    return name;
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


  toggleTopicExpansion(topicId: string): void {
    if (this.expandedTopics.has(topicId)) {
      this.expandedTopics.delete(topicId);
    } else {
      this.expandedTopics.add(topicId);
    }
  }

  isTopicExpanded(topicId: string): boolean {
    return this.expandedTopics.has(topicId);
  }

  onClaimTopic(topic: TopicPitch): void {
    this.topicToCliam = topic;
    this.claimDeadline = '';
    this.showClaimModal = true;
  }

  closeClaimModal(): void {
    this.showClaimModal = false;
    this.topicToCliam = null;
    this.claimDeadline = '';
    this.claimingInProgress = false;
  }

  confirmClaimTopic(): void {
    if (!this.topicToCliam) return;

    this.claimingInProgress = true;

    const payload = {
      userDeadline: this.claimDeadline || null
    };

    this.backendService.post(`/topic-pitches/${this.topicToCliam._id}/claim`, payload).subscribe({
      next: () => {
        this.closeClaimModal();
        this.loadTopics(); // Refresh the list to show updated status
      },
      error: (error: any) => {
        console.error('Error claiming topic:', error);
        this.claimingInProgress = false;
      }
    });
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'reviewer': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'writer': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getRoleIndicatorColor(role: string): string {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'reviewer': return 'bg-blue-500 text-white';
      case 'writer': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'admin': return 'M12 4.354a4 4 0 110 8 4 4 0 010-8zM6 18a6 6 0 1112 0v1H6v-1z';
      case 'reviewer': return 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'writer': return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      default: return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
    }
  }

  getContributorDisplayName(user: any): string {
    return user.name || user.username || 'Unknown';
  }
}