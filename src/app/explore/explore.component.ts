import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  type: 'poem' | 'prose' | 'article' | 'cinema_essay';
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
  status: 'pending' | 'accepted' | 'rejected';
  reviewerId?: string;
  reviewNotes?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  submissionType: 'poem' | 'prose' | 'article' | 'cinema_essay';
  // Populated fields
  user?: User;
  contents?: Content[];
}

@Component({
  selector: 'app-explore',
  imports: [CommonModule, FormsModule],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css'
})
export class ExploreComponent {
  submissions = signal<Submission[]>([]);
  searchTerm = '';
  selectedType = '';
  sortBy = 'newest';


  filteredSubmissions = computed(() => {
    let filtered = this.submissions().filter(submission => {
      const matchesSearch = !this.searchTerm || 
        submission.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        submission.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        submission.user?.username?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesType = !this.selectedType || submission.submissionType === this.selectedType;
      
      return matchesSearch && matchesType;
    });

    // Sort submissions
    switch (this.sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered = filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'title':
        filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  });

  ngOnInit() {
    this.loadSubmissions();
  }

  loadSubmissions() {
    // Mock data - replace with actual API call
    const mockSubmissions: Submission[] = [
      {
        _id: '1',
        userId: '1',
        title: 'Whispers of the Ocean',
        description: 'A collection of poems exploring the depths of human emotion through oceanic metaphors.',
        contentIds: ['1', '2', '3'],
        status: 'accepted',
        reviewerId: '2',
        reviewNotes: 'Beautiful imagery and strong emotional resonance.',
        reviewedAt: new Date('2025-06-29'),
        createdAt: new Date('2025-06-28'),
        updatedAt: new Date('2025-06-29'),
        submissionType: 'poem',
        user: {
          _id: '1',
          email: 'jane.writer@example.com',
          username: 'jane_writer',
          role: 'user',
          createdAt: new Date('2025-06-01'),
          updatedAt: new Date('2025-06-01')
        },
        contents: [
          {
            _id: '1',
            userId: '1',
            title: 'Tidal Emotions',
            body: 'The waves crash against the shore...',
            type: 'poem',
            wordCount: 150,
            tags: ['ocean', 'emotions', 'nature'],
            createdAt: new Date('2025-06-28'),
            updatedAt: new Date('2025-06-28')
          },
          {
            _id: '2',
            userId: '1',
            title: 'Deep Currents',
            body: 'Beneath the surface lies...',
            type: 'poem',
            wordCount: 120,
            tags: ['ocean', 'depth', 'introspection'],
            createdAt: new Date('2025-06-28'),
            updatedAt: new Date('2025-06-28')
          }
        ]
      },
      {
        _id: '2',
        userId: '2',
        title: 'The Coffee Shop Chronicles',
        description: 'A heartwarming story about finding connection in unexpected places.',
        contentIds: ['3'],
        status: 'accepted',
        reviewerId: '3',
        reviewNotes: 'Engaging narrative with relatable characters.',
        reviewedAt: new Date('2025-06-25'),
        createdAt: new Date('2025-06-20'),
        updatedAt: new Date('2025-06-25'),
        submissionType: 'prose',
        user: {
          _id: '2',
          email: 'storyteller@example.com',
          username: 'storyteller_sam',
          role: 'user',
          createdAt: new Date('2025-05-15'),
          updatedAt: new Date('2025-05-15')
        },
        contents: [
          {
            _id: '3',
            userId: '2',
            title: 'The Coffee Shop Chronicles',
            body: 'The bell above the door chimed as Sarah pushed into the warmth...',
            type: 'prose',
            wordCount: 1200,
            tags: ['friendship', 'coffee', 'community', 'urban'],
            createdAt: new Date('2025-06-20'),
            updatedAt: new Date('2025-06-20')
          }
        ]
      },
      {
        _id: '3',
        userId: '3',
        title: 'The Evolution of Sci-Fi Cinema',
        description: 'An in-depth analysis of how science fiction cinema has evolved over the decades.',
        contentIds: ['4'],
        status: 'accepted',
        reviewerId: '4',
        reviewNotes: 'Comprehensive analysis with excellent historical context.',
        reviewedAt: new Date('2025-06-30'),
        createdAt: new Date('2025-06-15'),
        updatedAt: new Date('2025-06-30'),
        submissionType: 'cinema_essay',
        user: {
          _id: '3',
          email: 'filmcritic@example.com',
          username: 'cinema_scholar',
          role: 'user',
          createdAt: new Date('2025-04-10'),
          updatedAt: new Date('2025-04-10')
        },
        contents: [
          {
            _id: '4',
            userId: '3',
            title: 'The Evolution of Sci-Fi Cinema',
            body: 'From the early days of Georges Méliès to modern CGI spectacles...',
            type: 'cinema_essay',
            wordCount: 2500,
            tags: ['cinema', 'sci-fi', 'evolution', 'analysis'],
            createdAt: new Date('2025-06-15'),
            updatedAt: new Date('2025-06-15')
          }
        ]
      }
    ];

    this.submissions.set(mockSubmissions);
  }

  getTypeBadgeClass(type: string): string {
    const classes = {
      'poem': 'bg-purple-100 text-purple-800',
      'prose': 'bg-blue-100 text-blue-800',
      'article': 'bg-green-100 text-green-800',
      'cinema_essay': 'bg-orange-100 text-orange-800'
    };
    return classes[type as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getTypeLabel(type: string): string {
    const labels = {
      'poem': 'Poetry',
      'prose': 'Prose',
      'article': 'Article',
      'cinema_essay': 'Cinema Essay'
    };
    return labels[type as keyof typeof labels] || type;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getFirstContentTags(submission: Submission): string[] {
    if (!submission.contents || submission.contents.length === 0) return [];
    return submission.contents[0].tags.slice(0, 3); // Show max 3 tags
  }

  getTotalWordCount(submission: Submission): number {
    if (!submission.contents) return 0;
    return submission.contents.reduce((total, content) => total + content.wordCount, 0);
  }

  openSubmission(submission: Submission) {
    // Implement navigation to detailed view
    console.log('Opening submission:', submission._id);
    // Example: this.router.navigate(['/submission', submission._id]);
  }
}
