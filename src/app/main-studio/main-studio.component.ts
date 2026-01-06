import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { TopicPitchesComponent } from './topic-pitches/topic-pitches.component';
import { PromptManagementComponent } from './prompt-management/prompt-management.component';
import { MyClaimedTopicsComponent } from './my-claimed-topics/my-claimed-topics.component';
import { TabsComponent, TabItemComponent } from '../ui-components';

@Component({
  selector: 'app-main-studio',
  standalone: true,
  imports: [CommonModule, TopicPitchesComponent, PromptManagementComponent, MyClaimedTopicsComponent, TabsComponent, TabItemComponent],
  templateUrl: './main-studio.component.html',
  styleUrl: './main-studio.component.css'
})
export class MainStudioComponent implements OnInit {
  activeTab: string = 'pitches';
  loading = false;
  
  // User permissions
  isLoggedIn = false;
  isAdmin = false;
  isReviewer = false;
  isWriter = false;

  constructor(
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    
    // Check authentication and permissions
    this.authService.user$.subscribe((user: any) => {
      this.isLoggedIn = !!user;
      this.isAdmin = user?.role === 'admin';
      this.isReviewer = user?.role === 'reviewer' || this.isAdmin;
      this.isWriter = user?.role === 'writer' || this.isAdmin;
      
      // Set default tab based on permissions
      if (this.canAccessTab('pitches')) {
        this.activeTab = 'pitches';
      } else if (this.canAccessTab('prompts')) {
        this.activeTab = 'prompts';
      }
      
      this.loading = false;
    });

    // Handle hash navigation
    const hash = window.location.hash.substring(1);
    if (hash && this.canAccessTab(hash)) {
      this.activeTab = hash;
    }
  }

  setActiveTab(tab: string): void {
    if (this.canAccessTab(tab)) {
      this.activeTab = tab;
      // Update URL hash for better navigation
      window.location.hash = tab;
    }
  }

  canAccessTab(tab: string): boolean {
    switch (tab) {
      case 'pitches':
        return this.isLoggedIn; // All logged in users can access pitches
      case 'claimed':
        return this.isLoggedIn; // All logged in users can access their claimed topics
      case 'prompts':
        return this.isAdmin || this.isReviewer; // Admin and reviewers can manage prompts
      default:
        return false;
    }
  }
}