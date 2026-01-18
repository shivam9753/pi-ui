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

        <!-- Primary action buttons removed (use Quick Links below) -->

        <!-- Quick Links (compact card) -->
        <div class="mb-12">
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-tertiary); font-family: 'Source Sans Pro', sans-serif;">
            Quick Links
          </h2>

          <div class="mx-auto max-w-lg bg-[rgba(255,255,255,0.02)] p-3 rounded-lg">
            <nav role="navigation" aria-label="Quick links">
              <ul role="list" class="flex flex-wrap gap-3 justify-center m-0 p-0 list-none">
                <li role="listitem" *ngFor="let link of quickLinks">
                  <a [routerLink]="link.path" [attr.aria-label]="link.aria"
                     class="px-4 py-2 text-sm md:text-base rounded-full border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] transition transform hover:-translate-y-0.5 inline-block">
                    {{ link.label }}
                  </a>
                </li>
              </ul>
            </nav>
          </div>
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

  // Quick links shown on the 404 page (update paths if your app uses different routes)
  readonly quickLinks: Array<{ label: string; path: string; aria?: string }> = [
    { label: 'Submit your content', path: '/submit', aria: 'Navigate to submission editor to submit your content' },
    { label: 'Manage your profile', path: '/profile', aria: 'Go to your profile settings and manage your profile' },
    { label: 'Read featured poem', path: '/featured', aria: 'Open the featured poem' }
  ];

  private readonly literary404Messages = [
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