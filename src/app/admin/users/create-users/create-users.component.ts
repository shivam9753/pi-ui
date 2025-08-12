import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-create-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-users.component.html',
  styleUrl: './create-users.component.css'
})
export class CreateUsersComponent {
  newUser = {
    name: '',
    username: '',
    email: ''
  };
  
  isSubmitting = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(private http: HttpClient) {}

  createUser() {
    if (!this.newUser.name || !this.newUser.username || !this.newUser.email) {
      this.showMessage('Please fill all fields', 'error');
      return;
    }

    this.isSubmitting = true;
    
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });
    
    this.http.post(`${environment.apiBaseUrl}/admin/users`, this.newUser, { headers }).subscribe({
      next: (res: any) => {
        this.showMessage('User created successfully', 'success');
        this.resetForm();
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Failed to create user', 'error');
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  resetForm() {
    this.newUser = { name: '', username: '', email: '' };
  }

  showMessage(msg: string, type: 'success' | 'error' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }
}