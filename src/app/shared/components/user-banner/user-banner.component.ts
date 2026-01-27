import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-user-banner',
  templateUrl: './user-banner.component.html',
  styleUrls: ['./user-banner.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class UserBannerComponent implements OnInit, OnChanges {
  @Input() userId: string | null = null;

  loading = false;
  error: string | null = null;
  user: any = null; // Keep loose any for flexibility

  constructor(private readonly userService: UserService) {}

  ngOnInit() {
    this.loadUser();
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.loadUser();
  }

  loadUser() {
    if (!this.userId) return;
    this.loading = true;
    this.error = null;
    this.userService.getUserProfile(this.userId).subscribe({
      next: (res: any) => {
        this.user = res.user || (res as any).profile || res;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err?.message ?? 'Failed to load user';
        this.loading = false;
      }
    });
  }
}
