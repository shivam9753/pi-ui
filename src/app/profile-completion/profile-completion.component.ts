import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
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
  // Input properties for reusability
  @Input() mode: 'completion' | 'edit' = 'completion';
  @Input() initialData: any = null;
  @Input() showContainer = true;
  @Input() showHeader = true;
  @Input() showSkipButton = true;
  @Input() customTitle = '';
  @Input() customSubtitle = '';
  
  // Output events
  @Output() profileSaved = new EventEmitter<any>();
  @Output() profileCancelled = new EventEmitter<void>();
  @Output() profileSkipped = new EventEmitter<void>();
  
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
    // Set edit mode based on input mode
    this.isEditMode = this.mode === 'edit';
    
    // Use provided initial data or get current user
    if (this.initialData) {
      this.user = this.initialData;
    } else {
      this.user = this.authService.getCurrentUser();
      if (!this.user && this.mode === 'completion') {
        this.router.navigate(['/login']);
        return;
      }
    }

    // If no user data available and this is edit mode, it means we're being used
    // as a reusable component and user data will be provided via initialData
    if (!this.user && this.mode === 'edit') {
      // Component is being used in edit mode but no data provided yet
      // This is fine, data might be loaded asynchronously
      return;
    }

    // Pre-fill with existing data
    this.loadInitialData();
  }

  private loadInitialData() {
    if (!this.user) return;
    
    // If we're in completion mode, determine if user actually needs completion
    if (this.mode === 'completion') {
      this.isEditMode = !this.needsProfileCompletion(this.user);
    }
    
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

  // Public method to update the component with new data
  updateUserData(userData: any) {
    this.user = userData;
    this.loadInitialData();
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

      const profileUpdateData: any = {
        name: this.profileData.name.trim(),
        bio: this.profileData.bio.trim(),
        profileCompleted: true
      };

      // Only include profileImage if it's a valid URL
      if (profileImageUrl && profileImageUrl.trim() && profileImageUrl !== '') {
        profileUpdateData.profileImage = profileImageUrl;
      }

      // Get the correct user ID
      let userId = this.user?.id || (this.user as any)?._id;
      
      // If still no ID, try to get from auth service
      if (!userId) {
        const currentUser = this.authService.getCurrentUser();
        userId = currentUser?.id || (currentUser as any)?._id;
      }

      if (!userId) {
        this.showToast('Unable to identify user. Please try logging in again.', 'error');
        return;
      }

      // Update profile via API with correct user ID
      await this.updateProfileWithUserId(profileUpdateData, userId);

      const successMessage = this.mode === 'edit' ? 'Profile updated successfully!' : 'Profile completed successfully!';
      this.showToast(successMessage, 'success');
      
      // Emit the profileSaved event with the updated data
      this.profileSaved.emit({
        ...profileUpdateData,
        id: userId,
        _id: userId
      });

      // Only navigate if we're in standalone completion mode
      if (this.mode === 'completion') {
        setTimeout(() => {
          this.router.navigate(['/explore']);
        }, 2000);
      }

    } catch (error) {
      console.error('Profile update error:', error);
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
    this.authService['userSubject'].next(updatedUser as any);
  }

  private async updateProfileWithUserId(profileData: any, userId: string): Promise<void> {
    const jwtToken = localStorage.getItem('jwt_token');
    if (!jwtToken) {
      throw new Error('Authentication required');
    }

    console.log('Updating profile for user ID:', userId);

    const response = await fetch(`${environment.apiBaseUrl}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Profile update failed:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Update local user data
    const currentUser = this.user || this.authService.getCurrentUser();
    const updatedUser = { 
      ...currentUser, 
      name: profileData.name,
      bio: profileData.bio,
      picture: profileData.profileImage,
      profileCompleted: true
    };
    
    localStorage.setItem('google_user', JSON.stringify(updatedUser));
    
    // Update auth service
    this.authService['userSubject'].next(updatedUser as any);
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
    // Emit skip event
    this.profileSkipped.emit();
    
    // Only navigate if we're in standalone completion mode
    if (this.mode === 'completion') {
      this.router.navigate(['/explore']);
    }
  }

  cancel() {
    // Emit cancel event
    this.profileCancelled.emit();
    
    // Only navigate if we're in standalone mode
    if (this.mode === 'completion') {
      if (this.user) {
        this.router.navigate(['/user-profile', this.user.id]);
      } else {
        this.router.navigate(['/explore']);
      }
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