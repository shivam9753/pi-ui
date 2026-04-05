import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileCompletionComponent } from './profile-completion.component';

@Component({
  selector: 'app-profile-completion-inline',
  standalone: true,
  imports: [CommonModule, ProfileCompletionComponent],
  template: `
    <div class="px-1 py-2">
      <app-profile-completion
        [mode]="mode"
        [initialData]="initialData"
        [showContainer]="false"
        [showHeader]="showHeader"
        [showSkipButton]="showSkipButton"
        [customTitle]="customTitle"
        [customSubtitle]="customSubtitle"
        (profileSaved)="profileSaved.emit($event)"
        (profileCancelled)="profileCancelled.emit()"
        (profileSkipped)="profileSkipped.emit()"
      ></app-profile-completion>
    </div>
  `
})
export class ProfileCompletionInlineComponent {
  @Input() mode: 'completion' | 'edit' = 'completion';
  @Input() initialData: any = null;
  @Input() showHeader = true;
  @Input() showSkipButton = true;
  @Input() customTitle = '';
  @Input() customSubtitle = '';

  @Output() profileSaved = new EventEmitter<any>();
  @Output() profileCancelled = new EventEmitter<void>();
  @Output() profileSkipped = new EventEmitter<void>();
}
