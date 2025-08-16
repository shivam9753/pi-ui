import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analysis-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"/>
          </svg>
          Analysis
        </h3>
        @if (analysisData && analysisData.length > 0) {
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Complete
          </span>
        }
      </div>

      @if (isAnalysisEnabled) {
      <button
        (click)="analyze.emit()"
        [disabled]="isAnalyzing"
        class="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm">
        @if (!isAnalyzing) {
          <span class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            AI Analysis
          </span>
        }
        @if (isAnalyzing) {
          <span class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </span>
        }
      </button>
      }

      @if (!isAnalysisEnabled) {
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <svg class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="text-sm text-blue-800">
              <p class="font-medium mb-1">🚀 AI Analysis Coming Soon!</p>
              <p class="text-blue-700 leading-relaxed">This feature will help identify plagiarized content and provide insights about themes, quality, and writing style.</p>
            </div>
          </div>
        </div>
      }

      @if (!analysisData || analysisData.length === 0) {
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="text-center bg-gray-50 rounded-lg p-3">
              <div class="text-sm font-medium text-gray-900">{{ submission?.submissionType | titlecase }}</div>
              <div class="text-xs text-gray-600">Type</div>
            </div>
            <div class="text-center bg-gray-50 rounded-lg p-3">
              <div class="text-sm font-medium text-gray-900">{{ submission?.userId?.name || 'Anonymous' }}</div>
              <div class="text-xs text-gray-600">Author</div>
            </div>
          </div>
          <div class="text-center py-6 text-gray-500">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-sm">Run analysis for detailed insights</p>
          </div>
        </div>
      }

      @if (analysisData && analysisData.length > 0) {
        <div class="space-y-3">
          @for (analysis of analysisData; track analysis.contentIndex) {
            <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div class="flex justify-between items-center mb-2 pb-2 border-b border-gray-300">
                <h4 class="text-sm font-semibold text-gray-900">{{ analysis.contentTitle }}</h4>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {{ analysis.contentType | titlecase }}
                </span>
              </div>
              
              @if (analysis.error) {
                <div class="text-center py-3">
                  <div class="text-red-500 text-sm">{{ analysis.errorMessage }}</div>
                </div>
              }
              
              @if (analysis.analysis && !analysis.error) {
                <div class="space-y-2">
                  <div class="bg-blue-50 rounded-lg p-2">
                    <div class="flex justify-between items-center mb-1">
                      <span class="text-xs font-medium text-blue-700">Quality Score</span>
                      <span class="text-sm font-bold text-blue-600">{{ analysis.analysis.quality }}/10</span>
                    </div>
                    <div class="w-full bg-blue-200 rounded-full h-1">
                      <div class="bg-blue-600 h-1 rounded-full" [style.width.%]="analysis.analysis.quality * 10"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AnalysisPanelComponent {
  @Input() submission: any;
  @Input() analysisData: any[] = [];
  @Input() isAnalyzing = false;
  @Input() isAnalysisEnabled = false;
  @Output() analyze = new EventEmitter<void>();
}