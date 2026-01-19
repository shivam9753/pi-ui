import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-published-authors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './published-authors.component.html',
  styleUrls: ['./published-authors.component.css']
})
export class PublishedAuthorsComponent implements OnInit {
  authors: Array<{ _id: string; name: string }> = [];
  loading = true;

  // pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalCount = 0;
  hasMore = false;

  constructor(private readonly userService: UserService, private readonly router: Router) {}

  ngOnInit(): void {
    this.loadAuthors();
  }

  loadAuthors(): void {
    this.loading = true;
    const skip = (this.currentPage - 1) * this.itemsPerPage;
    const params = {
      limit: this.itemsPerPage,
      skip,
      sortBy: 'name',
      order: 'asc'
    };

    this.userService.getUsersWithPublished(params).subscribe({
      next: (res: { users: Array<{ _id: string; name: string }>; pagination?: any }) => {
        this.authors = res.users || [];
        this.totalCount = res.pagination?.total || 0;
        this.hasMore = res.pagination?.hasNext || false;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  goToPage(page: number) {
    if (page < 1) return;
    this.currentPage = page;
    this.loadAuthors();
  }

  trackById(_index: number, item: any) {
    return item._id;
  }

  viewAuthorProfile(author: { _id: string }) {
    this.router.navigate(['/author', author._id]);
  }

  // Helper to derive initials from name for a simple avatar-look (no external images)
  getInitials(name?: string): string {
    if (!name) return 'A';
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'A';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
