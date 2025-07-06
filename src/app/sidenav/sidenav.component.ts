import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, GoogleUser } from '../auth.service';

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, CommonModule, TitleCasePipe ],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.css'
})
export class SidenavComponent {
  loggedInUser: GoogleUser | null = null;
  isMobile = false;
  showSidenav = true;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Fetch the current user when the component initializes
    this.loggedInUser = this.authService.getCurrentUser();
    this.authService.user$.subscribe(data => console.log(data));
    this.checkViewport();
    window.addEventListener('resize', () => this.checkViewport());
  }

  checkViewport() {
    this.isMobile = window.innerWidth <= 768;
    this.showSidenav = !this.isMobile;
  }
  
  toggleSidenav() {
    this.showSidenav = !this.showSidenav;
  }

  logout() {
    this.authService.signOut();
  }
}
