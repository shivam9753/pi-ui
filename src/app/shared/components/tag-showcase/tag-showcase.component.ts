import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionTagComponent } from '../submission-tag/submission-tag.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { SUBMISSION_TYPES, SUBMISSION_STATUSES } from '../../constants/submission-mappings';

@Component({
  selector: 'app-tag-showcase',
  standalone: true,
  imports: [CommonModule, SubmissionTagComponent, StatusBadgeComponent],
  template: `
    <div class="p-6 space-y-8">
      <!-- Submission Types -->
      <section>
        <h3 class="text-lg font-semibold mb-4">Submission Types</h3>
        <div class="flex flex-wrap gap-2">
          @for (type of submissionTypes; track type.id) {
            <app-submission-tag 
              [value]="type.id" 
              tagType="type"
              [showIcon]="true"
              size="sm">
            </app-submission-tag>
          }
        </div>
      </section>

      <!-- Submission Statuses -->
      <section>
        <h3 class="text-lg font-semibold mb-4">Submission Statuses</h3>
        <div class="flex flex-wrap gap-2">
          @for (status of submissionStatuses; track status.id) {
            <app-submission-tag 
              [value]="status.id" 
              tagType="status"
              [showIcon]="true"
              size="sm">
            </app-submission-tag>
          }
        </div>
      </section>

      <!-- Status Badges (Legacy Component) -->
      <section>
        <h3 class="text-lg font-semibold mb-4">Status Badges (Auto-detect)</h3>
        <div class="flex flex-wrap gap-2">
          @for (type of submissionTypes; track type.id) {
            <app-status-badge 
              [status]="type.id"
              [showIcon]="true"
              size="sm">
            </app-status-badge>
          }
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          @for (status of submissionStatuses; track status.id) {
            <app-status-badge 
              [status]="status.id"
              [showIcon]="true"
              size="sm">
            </app-status-badge>
          }
        </div>
      </section>

      <!-- Size Variants -->
      <section>
        <h3 class="text-lg font-semibold mb-4">Size Variants</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-sm w-12">XS:</span>
            <app-submission-tag value="poem" tagType="type" size="xs" [showIcon]="true"></app-submission-tag>
            <app-submission-tag value="accepted" tagType="status" size="xs" [showIcon]="false"></app-submission-tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-12">SM:</span>
            <app-submission-tag value="article" tagType="type" size="sm" [showIcon]="true"></app-submission-tag>
            <app-submission-tag value="pending_review" tagType="status" size="sm" [showIcon]="false"></app-submission-tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-12">MD:</span>
            <app-submission-tag value="prose" tagType="type" size="md" [showIcon]="true"></app-submission-tag>
            <app-submission-tag value="in_progress" tagType="status" size="md" [showIcon]="true"></app-submission-tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-12">LG:</span>
            <app-submission-tag value="opinion" tagType="type" size="lg" [showIcon]="true"></app-submission-tag>
            <app-submission-tag value="needs_revision" tagType="status" size="lg" [showIcon]="true"></app-submission-tag>
          </div>
        </div>
      </section>

      <!-- Variant Styles -->
      <section>
        <h3 class="text-lg font-semibold mb-4">Style Variants</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-sm w-16">Soft:</span>
            <app-submission-tag value="cinema_essay" tagType="type" variant="soft" [showIcon]="true"></app-submission-tag>
            <app-submission-tag value="published" tagType="status" variant="soft" [showIcon]="true"></app-submission-tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16">Outline:</span>
            <app-submission-tag value="cinema_essay" tagType="type" variant="outline" [showIcon]="true"></app-submission-tag>
            <app-submission-tag value="published" tagType="status" variant="outline" [showIcon]="true"></app-submission-tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16">Solid:</span>
            <app-submission-tag value="cinema_essay" tagType="type" variant="solid" [showIcon]="true"></app-submission-tag>
            <app-submission-tag value="published" tagType="status" variant="solid" [showIcon]="true"></app-submission-tag>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TagShowcaseComponent {
  submissionTypes = Object.values(SUBMISSION_TYPES);
  submissionStatuses = Object.values(SUBMISSION_STATUSES);
}