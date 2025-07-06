import { Component } from '@angular/core';
import { DynamicTableComponent } from '../dynamic-table/dynamic-table.component';

@Component({
  selector: 'app-user-list',
  imports: [DynamicTableComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent {
  users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'reviewer' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' }
  ];

  viewUser(user: any) {
    console.log('Viewing user:', user);
  }

  deleteUser(user: any) {
    console.log('Deleting user:', user);
  }
}
