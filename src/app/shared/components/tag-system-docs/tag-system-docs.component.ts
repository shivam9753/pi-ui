import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionTagComponent } from '../submission-tag/submission-tag.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-tag-system-docs',
  standalone: true,
  imports: [CommonModule, SubmissionTagComponent, StatusBadgeComponent],
  template: `
    <div class="p-6 space-y-8 max-w-4xl">
      <header>
        <h1 class="text-3xl font-bold text-gray-900 mb-4">Consistent Tag System Documentation</h1>
        <p class="text-gray-600 text-lg leading-relaxed">
          This system provides consistent display and mapping for submission types and statuses across the application.
          All submission types and statuses now have proper display names, icons, and consistent colors.
        </p>
      </header>

      <!-- Quick Reference -->
      <section class="bg-gray-50 p-6 rounded-lg">
        <h2 class="text-xl font-semibold mb-4">Quick Reference</h2>
        
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Submission Types -->
          <div>
            <h3 class="font-medium mb-3">Submission Types (All Accent Color + Unique Icons)</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">poem</code>
                <app-submission-tag value="poem" tagType="type" size="xs" [showIcon]="true"></app-submission-tag>
                <span class="text-xs text-gray-500">✒️ Feather/Quill</span>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">article</code>
                <app-submission-tag value="article" tagType="type" size="xs" [showIcon]="true"></app-submission-tag>
                <span class="text-xs text-gray-500">📰 Newspaper</span>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">prose</code>
                <app-submission-tag value="prose" tagType="type" size="xs" [showIcon]="true"></app-submission-tag>
                <span class="text-xs text-gray-500">📖 Open Book</span>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">opinion</code>
                <app-submission-tag value="opinion" tagType="type" size="xs" [showIcon]="true"></app-submission-tag>
                <span class="text-xs text-gray-500">💬 Speech Bubble</span>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">cinema_essay</code>
                <app-submission-tag value="cinema_essay" tagType="type" size="xs" [showIcon]="true"></app-submission-tag>
                <span class="text-xs text-gray-500">🎥 Film Camera</span>
              </div>
            </div>
          </div>

          <!-- Submission Statuses -->
          <div>
            <h3 class="font-medium mb-3">Submission Statuses</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">pending_review</code>
                <app-submission-tag value="pending_review" tagType="status" size="xs" [showIcon]="false"></app-submission-tag>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">in_progress</code>
                <app-submission-tag value="in_progress" tagType="status" size="xs" [showIcon]="false"></app-submission-tag>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">needs_revision</code>
                <app-submission-tag value="needs_revision" tagType="status" size="xs" [showIcon]="false"></app-submission-tag>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">accepted</code>
                <app-submission-tag value="accepted" tagType="status" size="xs" [showIcon]="false"></app-submission-tag>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">rejected</code>
                <app-submission-tag value="rejected" tagType="status" size="xs" [showIcon]="false"></app-submission-tag>
              </div>
              <div class="flex justify-between items-center">
                <code class="bg-white px-2 py-1 rounded">published</code>
                <app-submission-tag value="published" tagType="status" size="xs" [showIcon]="false"></app-submission-tag>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Usage Examples -->
      <section>
        <h2 class="text-xl font-semibold mb-4">Usage Examples</h2>
        
        <div class="space-y-6">
          <!-- New SubmissionTagComponent -->
          <div class="bg-white border rounded-lg p-4">
            <h3 class="font-medium mb-3">New SubmissionTagComponent (Recommended)</h3>
            <div class="space-y-3">
              <div class="bg-gray-50 p-3 rounded">
                <code class="text-sm">
                  &lt;app-submission-tag value="poem" tagType="type" [showIcon]="true" size="sm"&gt;&lt;/app-submission-tag&gt;
                </code>
                <div class="mt-2">
                  <app-submission-tag value="poem" tagType="type" [showIcon]="true" size="sm"></app-submission-tag>
                </div>
              </div>
              
              <div class="bg-gray-50 p-3 rounded">
                <code class="text-sm">
                  &lt;app-submission-tag value="pending_review" tagType="status" [showIcon]="false" size="sm"&gt;&lt;/app-submission-tag&gt;
                </code>
                <div class="mt-2">
                  <app-submission-tag value="pending_review" tagType="status" [showIcon]="false" size="sm"></app-submission-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- Updated StatusBadgeComponent -->
          <div class="bg-white border rounded-lg p-4">
            <h3 class="font-medium mb-3">Updated StatusBadgeComponent (Auto-detect)</h3>
            <div class="space-y-3">
              <div class="bg-gray-50 p-3 rounded">
                <code class="text-sm">
                  &lt;app-status-badge status="article" [showIcon]="true" size="sm"&gt;&lt;/app-status-badge&gt;
                </code>
                <div class="mt-2">
                  <app-status-badge status="article" [showIcon]="true" size="sm"></app-status-badge>
                </div>
              </div>
              
              <div class="bg-gray-50 p-3 rounded">
                <code class="text-sm">
                  &lt;app-status-badge status="needs_revision" [showIcon]="true" size="sm"&gt;&lt;/app-status-badge&gt;
                </code>
                <div class="mt-2">
                  <app-status-badge status="needs_revision" [showIcon]="true" size="sm"></app-status-badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Properties -->
      <section>
        <h2 class="text-xl font-semibold mb-4">Component Properties</h2>
        
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-medium mb-3">SubmissionTagComponent</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left">Property</th>
                  <th class="px-3 py-2 text-left">Type</th>
                  <th class="px-3 py-2 text-left">Default</th>
                  <th class="px-3 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr>
                  <td class="px-3 py-2 font-mono">value</td>
                  <td class="px-3 py-2">string</td>
                  <td class="px-3 py-2">-</td>
                  <td class="px-3 py-2">The submission type or status identifier</td>
                </tr>
                <tr>
                  <td class="px-3 py-2 font-mono">tagType</td>
                  <td class="px-3 py-2">'type' | 'status'</td>
                  <td class="px-3 py-2">'status'</td>
                  <td class="px-3 py-2">Whether this is a submission type or status tag</td>
                </tr>
                <tr>
                  <td class="px-3 py-2 font-mono">showIcon</td>
                  <td class="px-3 py-2">boolean</td>
                  <td class="px-3 py-2">true</td>
                  <td class="px-3 py-2">Whether to show the icon</td>
                </tr>
                <tr>
                  <td class="px-3 py-2 font-mono">size</td>
                  <td class="px-3 py-2">'xs' | 'sm' | 'md' | 'lg'</td>
                  <td class="px-3 py-2">'sm'</td>
                  <td class="px-3 py-2">Size of the tag</td>
                </tr>
                <tr>
                  <td class="px-3 py-2 font-mono">variant</td>
                  <td class="px-3 py-2">'solid' | 'outline' | 'soft'</td>
                  <td class="px-3 py-2">'soft'</td>
                  <td class="px-3 py-2">Visual style variant</td>
                </tr>
                <tr>
                  <td class="px-3 py-2 font-mono">clickable</td>
                  <td class="px-3 py-2">boolean</td>
                  <td class="px-3 py-2">false</td>
                  <td class="px-3 py-2">Whether the tag is clickable</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Benefits -->
      <section>
        <h2 class="text-xl font-semibold mb-4">Benefits</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="font-medium text-green-800 mb-2">✅ Consistency</h3>
            <p class="text-green-700 text-sm">All submission types and statuses display the same way across the entire application.</p>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-medium text-blue-800 mb-2">🎨 Visual Hierarchy</h3>
            <p class="text-blue-700 text-sm">Color-coded tags make it easy to distinguish between different types and statuses.</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <h3 class="font-medium text-purple-800 mb-2">🔧 Maintainable</h3>
            <p class="text-purple-700 text-sm">Centralized mapping makes it easy to update display names and colors.</p>
          </div>
          <div class="bg-primary-light p-4 rounded-lg">
            <h3 class="font-medium text-primary-dark mb-2">📱 Responsive</h3>
            <p class="text-primary-dark text-sm">Multiple size variants for different screen sizes and contexts.</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class TagSystemDocsComponent {}