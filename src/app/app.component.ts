
import { Component } from '@angular/core';
import { HomepageComponent } from './homepage/homepage.component';
import { SubmissionCardComponent } from './submission-card/submission-card.component';

@Component({
  selector: 'app-root',
  imports: [HomepageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'pi';
  
}
