
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { AuthService } from './services/auth.service';
import { BreathingLoaderComponent } from './shared/loader/breathing-loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, BreathingLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'pi';
  
  constructor(
    private authService: AuthService, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  ngOnInit() {
    // Force session restoration on app startup (helps during development)
    setTimeout(() => {
      this.authService.forceRestoreSession();
    }, 500);
  }
}
