import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { compressImageToAVIF } from '../../../shared/utils/image-compression.util';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { API_ENDPOINTS } from '../../../shared/constants/api.constants';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-create-users',
  imports: [CommonModule, FormsModule, AdminPageHeaderComponent],
  templateUrl: './create-users.component.html',
  styleUrl: './create-users.component.css'
})
export class CreateUsersComponent {
  newUser = {
    name: '',
    username: '',
    email: '',
    bio: '',
    role: 'user'
  };
  
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isSubmitting = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  uploadingImage = false;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  async createUser() {
    if (!this.newUser.name || !this.newUser.username || !this.newUser.email) {
      this.showMessage('Please fill all required fields', 'error');
      return;
    }

    this.isSubmitting = true;
    
    try {
      // Create user using UserService
      const createResponse = await this.userService.createUser(this.newUser).toPromise();
      
      // If there's a profile image, upload it
      if (this.selectedFile && createResponse?.user) {
        await this.uploadProfileImage(createResponse.user.id);
      }
      
      this.showMessage('User created successfully', 'success');
      this.resetForm();
    } catch (err: any) {
      this.showMessage(err.error?.message || 'Failed to create user', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  async uploadProfileImage(userId: string) {
    if (!this.selectedFile) return;
    
    this.uploadingImage = true;
    
    try {
      const formData = new FormData();
      formData.append('profileImage', this.selectedFile);
      
      const jwtToken = localStorage.getItem('jwt_token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${jwtToken}`
      });
      
      await this.http.post(`${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.UPLOAD_PROFILE_IMAGE(userId)}`, formData, { headers }).toPromise();
    } catch (error) {
      this.showMessage('User created but profile image upload failed', 'error');
    } finally {
      this.uploadingImage = false;
    }
  }

  resetForm() {
    this.newUser = { name: '', username: '', email: '', bio: '', role: 'user' };
    this.selectedFile = null;
    this.previewUrl = null;
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showMessage('Please select an image file', 'error');
        return;
      }
      
      // Validate file size (5MB max for original)
      if (file.size > 5 * 1024 * 1024) {
        this.showMessage('Original image size must be less than 5MB', 'error');
        return;
      }
      
      try {
        // Compress to AVIF format
        this.showMessage('Compressing image to AVIF format...', 'info');
        const compressed = await compressImageToAVIF(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.85
        });
        
        this.selectedFile = compressed.file;
        this.previewUrl = compressed.dataUrl;
        
        // Show compression info
        const originalSize = (file.size / 1024).toFixed(1);
        const compressedSize = (compressed.file.size / 1024).toFixed(1);
        this.showMessage(
          `Image compressed: ${originalSize}KB → ${compressedSize}KB (${compressed.compressionRatio}% reduction)`, 
          'success'
        );
      } catch (error) {
        this.showMessage('Failed to compress image. Using original.', 'error');
        
        // Fallback to original file
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.previewUrl = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  showMessage(msg: string, type: 'success' | 'error' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }
}