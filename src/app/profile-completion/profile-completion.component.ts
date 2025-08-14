import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, GoogleUser } from '../services/auth.service';
import { BackendService } from '../services/backend.service';
import { ToastNotificationComponent } from '../shared/components/toast-notification/toast-notification.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-profile-completion',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastNotificationComponent],
  templateUrl: './profile-completion.component.html',
  styleUrls: ['./profile-completion.component.css']
})
export class ProfileCompletionComponent implements OnInit {
  user: GoogleUser | null = null;
  profileData = {
    name: '',
    bio: '',
    profileImage: null as File | null
  };
  profileImagePreview: string | null = null;
  isSubmitting = false;
  isEditMode = false;
  
  // Toast notification properties
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' | 'warning' = 'info';
  showToastFlag = false;

  constructor(
    private authService: AuthService,
    private backendService: BackendService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    // Allow profile completion/editing for all users
    // If they came here directly (not from login flow), they can edit their profile

    // Determine if this is edit mode (user already has some profile data)
    this.isEditMode = !this.needsProfileCompletion(this.user);
    
    // Pre-fill with existing data from the user object
    // Use backend-validated data if available, otherwise use Google data
    this.profileData.name = this.user.name || '';
    this.profileData.bio = this.user.bio || '';
    
    // Set image preview if user already has a profile image
    // Check for both backend profileImage and Google picture
    if (this.user.picture) {
      this.profileImagePreview = this.user.picture;
    }
    
  }

  needsProfileCompletion(user: any): boolean {
    // Check if user needs profile completion based on backend response
    if (user.needsProfileCompletion) return true;
    
    // Also check for default values that indicate incomplete profile
    return !user.name || 
           user.name.trim() === '' || 
           user.name === 'Google authenticated user' ||
           !user.bio || 
           user.bio.trim() === '' || 
           user.bio === 'Google authenticated user';
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showToast('Please select a valid image file', 'error');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('Image size must be less than 5MB', 'error');
        return;
      }

      this.profileData.profileImage = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.profileData.profileImage = null;
    this.profileImagePreview = null;
    
    // Reset file input
    const fileInput = document.getElementById('profileImage') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    try {
      let profileImageUrl = this.user?.picture || '';

      // Upload new image if selected
      if (this.profileData.profileImage) {
        profileImageUrl = await this.uploadProfileImage();
      }

      const profileUpdateData = {
        name: this.profileData.name.trim(),
        bio: this.profileData.bio.trim(),
        profileImage: profileImageUrl,
        profileCompleted: true
      };

      // Update profile via API
      await this.updateProfile(profileUpdateData);

      this.showToast('Profile completed successfully!', 'success');
      
      // Navigate to explore after a brief delay
      setTimeout(() => {
        this.router.navigate(['/explore']);
      }, 2000);

    } catch (error) {
      this.showToast('An error occurred while updating your profile.', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async uploadProfileImage(): Promise<string> {
    if (!this.profileData.profileImage) return '';

    const formData = new FormData();
    formData.append('image', this.profileData.profileImage);

    const jwtToken = localStorage.getItem('jwt_token');
    const headers: { [key: string]: string } = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};

    try {
      const response = await fetch(`${environment.apiBaseUrl}/images/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.image?.url || result.url || result.imageUrl || '';
    } catch (error) {
      throw new Error('Failed to upload profile image');
    }
  }

  private async updateProfile(profileData: any): Promise<void> {
    const jwtToken = localStorage.getItem('jwt_token');
    if (!jwtToken || !this.user) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${environment.apiBaseUrl}/users/${this.user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Update local user data
    const updatedUser = { 
      ...this.user, 
      name: profileData.name,
      bio: profileData.bio,
      picture: profileData.profileImage,
      profileCompleted: true
    };
    localStorage.setItem('google_user', JSON.stringify(updatedUser));
    
    // Update auth service
    this.authService['userSubject'].next(updatedUser);
  }

  validateForm(): boolean {
    if (!this.profileData.name.trim()) {
      this.showToast('Please enter your name', 'error');
      return false;
    }

    if (this.profileData.name.trim().length < 2) {
      this.showToast('Name must be at least 2 characters long', 'error');
      return false;
    }

    if (!this.profileData.bio.trim()) {
      this.showToast('Please enter your bio', 'error');
      return false;
    }

    if (this.profileData.bio.trim().length < 20) {
      this.showToast('Bio must be at least 20 characters long', 'error');
      return false;
    }

    if (this.profileData.bio.trim().length > 500) {
      this.showToast('Bio must be less than 500 characters', 'error');
      return false;
    }

    return true;
  }

  skipForNow() {
    // Allow user to skip profile completion and navigate to explore
    this.router.navigate(['/explore']);
  }

  cancel() {
    // Navigate back to user profile page
    if (this.user) {
      this.router.navigate(['/user-profile', this.user.id]);
    } else {
      this.router.navigate(['/explore']);
    }
  }

  getBioCharacterCount(): number {
    return this.profileData.bio.length;
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;
  }

  hideToast() {
    this.showToastFlag = false;
  }
}