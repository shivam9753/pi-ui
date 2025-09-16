import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4" style="background-color: var(--bg-primary);">
      <div class="max-w-4xl w-full text-center">
        <!-- Large 404 Display -->
        <div class="mb-12">
          <h1 class="text-9xl font-bold mb-6" style="color: var(--text-tertiary); font-family: 'Source Sans Pro', sans-serif;">
            404
          </h1>
        </div>

        <!-- Literary Message -->
        <div class="mb-16">
          <p class="text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto text-serif"
             style="color: var(--text-secondary); font-family: 'Crimson Text', Georgia, serif; font-style: italic; line-height: 1.6;">
            {{ randomMessage }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            routerLink="/explore"
            class="btn-primary px-8 py-4 text-lg font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Browse Poems
          </a>

          <a
            routerLink="/"
            class="btn-secondary px-8 py-4 text-lg font-medium rounded-lg transition-all duration-200"
          >
            Go Home
          </a>
        </div>

        <!-- Decorative Elements -->
        <div class="text-center">
          <div class="inline-block w-16 h-px mb-4" style="background-color: var(--border-primary);"></div>
          <p class="text-sm" style="color: var(--text-tertiary); font-family: 'Source Sans Pro', sans-serif;">
            Lost in the digital cosmos of poetry
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class NotFoundComponent {
  randomMessage: string;

  private literary404Messages = [
    "Error 404: Page Not Found-er! This page has gone completely Shakespeare - it's having an existential crisis asking 'To be or not to be... found.'",

    "Dickens! We've Lost Another Page! It was the best of times, it was the worst of times... mostly the worst because your page vanished.",

    "Wilde Guess Where Your Page Went! We can resist everything except temptation... and apparently losing your page. Oscar would be disappointed.",

    "We lost your page. It went off to be a governess at Thornfield Hall and hasn't written back.",

    "This page believed in the green light but got lost crossing the bay of broken URLs.",

    "This page achieved moksha and transcended to a higher server.",

    "This page boarded the wrong train at New Delhi station and ended up in digital nowhere.",

    "Born at the stroke of server midnight, this page got lost in the partition of our database."
  ];

  constructor() {
    this.randomMessage = this.getRandomMessage();
  }

  private getRandomMessage(): string {
    const randomIndex = Math.floor(Math.random() * this.literary404Messages.length);
    return this.literary404Messages[randomIndex];
  }
}