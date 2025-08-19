import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { WhatsNewItem, WHATS_NEW_DATA } from './whats-new.data';

@Component({
  selector: 'app-whats-new',
  imports: [CommonModule, FormsModule],
  templateUrl: './whats-new.component.html',
  styleUrl: './whats-new.component.css'
})
export class WhatsNewComponent implements OnInit {
  items: WhatsNewItem[] = [];
  isAdmin = false;
  showAddForm = false;
  
  newItem: Partial<WhatsNewItem> = {
    title: '',
    description: '',
    type: 'Feature',
    link: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadItems();
    this.checkAdminStatus();
  }

  private checkAdminStatus() {
    this.authService.user$.subscribe(user => {
      this.isAdmin = user?.role === 'admin';
    });
  }

  private loadItems() {
    this.items = [...WHATS_NEW_DATA].sort((a, b) => 
      new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }

  addNewItem() {
    if (!this.isAdmin || !this.newItem.title || !this.newItem.description) {
      return;
    }

    const item: WhatsNewItem = {
      id: Date.now().toString(),
      title: this.newItem.title!,
      description: this.newItem.description!,
      type: this.newItem.type!,
      link: this.newItem.link || '#',
      dateAdded: new Date().toISOString().split('T')[0]
    };

    this.items.unshift(item);
    
    // Note: In a real app, you'd save this to the backend
    // For now, we'll just add it to the current session
    console.log('New item added (session only):', item);
    
    // Reset form
    this.newItem = {
      title: '',
      description: '',
      type: 'Feature',
      link: ''
    };
    this.showAddForm = false;
  }

  navigateToLink(link: string) {
    if (link && link !== '#') {
      this.router.navigate([link]);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getTypeClass(type: string): string {
    return type === 'Feature' ? 'feature' : 'defect';
  }
}
