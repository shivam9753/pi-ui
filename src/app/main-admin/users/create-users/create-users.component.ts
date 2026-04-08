import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { compressImageToAVIF } from '../../../shared/utils/image-compression.util';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { API_ENDPOINTS } from '../../../shared/constants/api.constants';
import { UserService } from '../../../services/user.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-create-users',
  imports: [CommonModule, FormsModule, AdminPageHeaderComponent, MatButtonModule],
  templateUrl: './create-users.component.html',
  styleUrl: './create-users.component.css'
})
export class CreateUsersComponent implements OnChanges {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialData: any = null;

  @Output() created = new EventEmitter<any>();
  @Output() saved = new EventEmitter<any>();

  newUser = {
    name: '',
    email: '',
    bio: '',
    role: 'user',
    socialLinks: {
      twitter: '',
      instagram: '',
      facebook: ''
    }
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialData'] && this.initialData && this.mode === 'edit') {
      this.newUser = {
        name: this.initialData.name || '',
        email: this.initialData.email || '',
        bio: this.initialData.bio || '',
        role: this.initialData.role || 'user',
        socialLinks: {
          twitter: this.initialData.socialLinks?.twitter || '',
          instagram: this.initialData.socialLinks?.instagram || '',
          facebook: this.initialData.socialLinks?.facebook || ''
        }
      };
      this.selectedFile = null;
      this.previewUrl = null;
    }
  }

  async submit() {
    if (this.mode === 'edit') {
      await this.updateUser();
    } else {
      await this.createUser();
    }
  }

  async createUser() {
    if (!this.newUser.name || !this.newUser.email) {
      this.showMessage('Please fill all required fields', 'error');
      return;
    }

    this.isSubmitting = true;
    
    try {
      const createResponse = await this.userService.createUser(this.newUser as any).toPromise();
      
      if (this.selectedFile && createResponse?.user) {
        await this.uploadProfileImage(createResponse.user.id);
      }
      
      this.created.emit(createResponse?.user || null);
      this.showMessage('User created successfully', 'success');
      this.resetForm();
    } catch (err: any) {
      this.showMessage(err.error?.message || 'Failed to create user', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  async updateUser() {
    if (!this.initialData?._id) return;

    if (!this.newUser.name || !this.newUser.email) {
      this.showMessage('Please fill all required fields', 'error');
      return;
    }

    this.isSubmitting = true;

    try {
      const updateResponse = await this.userService.updateUser(this.initialData._id, {
        name: this.newUser.name,
        email: this.newUser.email,
        bio: this.newUser.bio,
        socialLinks: this.newUser.socialLinks
      }).toPromise();

      if (this.newUser.role !== this.initialData.role) {
        await this.userService.updateUserRole(this.initialData._id, this.newUser.role as any).toPromise();
      }

      if (this.selectedFile) {
        await this.uploadProfileImage(this.initialData._id);
      }

      this.saved.emit(updateResponse?.user || null);
      this.showMessage('User updated successfully', 'success');
    } catch (err: any) {
      this.showMessage(err.error?.message || 'Failed to update user', 'error');
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
    this.newUser = { name: '', email: '', bio: '', role: 'user', socialLinks: { twitter: '', instagram: '', facebook: '' } };
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