import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editorial-criteria',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Tab Buttons -->
      <div class="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button 
          class="flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors duration-200"
          [class.bg-green-600]="activeTab === 'green'"
          [class.text-white]="activeTab === 'green'"
          [class.text-gray-600]="activeTab !== 'green'"
          [class.hover:text-gray-900]="activeTab !== 'green'"
          [class.dark:text-gray-300]="activeTab !== 'green'"
          [class.dark:hover:text-white]="activeTab !== 'green'"
          (click)="switchTab('green')">
          <span class="flex items-center justify-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            What We Look For
          </span>
        </button>
        <button 
          class="flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors duration-200"
          [class.bg-red-600]="activeTab === 'red'"
          [class.text-white]="activeTab === 'red'"
          [class.text-gray-600]="activeTab !== 'red'"
          [class.hover:text-gray-900]="activeTab !== 'red'"
          [class.dark:text-gray-300]="activeTab !== 'red'"
          [class.dark:hover:text-white]="activeTab !== 'red'"
          (click)="switchTab('red')">
          <span class="flex items-center justify-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            Red Flags to Avoid
          </span>
        </button>
      </div>

      <!-- Green Flags Content -->
      <div *ngIf="activeTab === 'green'" class="space-y-2">
        <div *ngFor="let item of greenFlags" class="flex items-start space-x-2">
          <div class="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-green-900 dark:text-green-100">{{ item.title }}</h4>
            <p class="text-xs text-green-800 dark:text-green-200 leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </div>

      <!-- Red Flags Content -->
      <div *ngIf="activeTab === 'red'" class="space-y-2">
        <div *ngFor="let item of redFlags" class="flex items-start space-x-2">
          <div class="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-red-900 dark:text-red-100">{{ item.title }}</h4>
            <p class="text-xs text-red-800 dark:text-red-200 leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EditorialCriteriaComponent {
  activeTab: 'green' | 'red' = 'green';

  greenFlags = [
    {
      title: 'Authentic Voice',
      description: 'Poems that sound like an actual person, not "A Poet" - with natural speech patterns and genuine personality.'
    },
    {
      title: 'Lived Specificity',
      description: 'Concrete details from real experience - your grandmother\'s exact kitchen, not generic "elderly wisdom."'
    },
    {
      title: 'Productive Messiness',
      description: 'Beautiful imperfection where language struggles in interesting ways, creating unexpected meaning.'
    },
    {
      title: 'Risk-Taking',
      description: 'Willingness to fail interestingly - whether through form, subject, or approach.'
    },
    {
      title: 'Emotional Complexity',
      description: 'Feelings that resist easy labels - love mixed with resentment, joy tinged with fear.'
    },
    {
      title: 'Fresh Imagery',
      description: 'Original metaphors that surprise rather than decorate; connections we haven\'t seen before.'
    },
    {
      title: 'Cultural Specificity',
      description: 'Details that reveal your actual world, background, and lived experience.'
    },
    {
      title: 'Natural Line Breaks',
      description: 'Breaks that serve meaning and breath, not just making text look "poetic."'
    },
    {
      title: 'Earned Difficulty',
      description: 'Complexity that serves the poem\'s needs, not showing off.'
    },
    {
      title: 'Surprising Turns',
      description: 'Moments that surprise even you as the writer; unexpected directions that feel inevitable in hindsight.'
    }
  ];

  redFlags = [
    {
      title: 'AI-Generated Perfection',
      description: 'Technically flawless but emotionally hollow - smooth, safe, and soulless.'
    },
    {
      title: 'Manufactured Metaphors',
      description: 'Forced comparisons chosen for cleverness rather than truth or emotional resonance.'
    },
    {
      title: 'Metaphor Overload',
      description: 'Too many competing images that muddle rather than clarify meaning.'
    },
    {
      title: 'Direct Plagiarism',
      description: 'Copying others\' work - we check, and we recognize lifted lines and concepts.'
    },
    {
      title: 'Concept Theft',
      description: 'Stealing unique structural ideas or approaches while changing surface words.'
    },
    {
      title: 'Clichéd Language',
      description: 'Roses are red territory; hearts like glass; dancing in rain; time healing wounds.'
    },
    {
      title: 'Purple Prose',
      description: 'Overly ornate language prioritizing "sounding poetic" over actual communication.'
    },
    {
      title: 'Vague Abstraction',
      description: 'Heavy use of "soul," "beauty," "eternity" without concrete grounding.'
    },
    {
      title: 'Forced Rhyme',
      description: 'Distorting natural syntax or choosing weaker words just to maintain rhyme scheme.'
    },
    {
      title: 'Emotional Telling',
      description: 'Declaring feelings ("I was sad") instead of creating experiences that evoke them.'
    },
    {
      title: 'Heavy-Handed Symbolism',
      description: 'Over-explaining obvious symbols; not trusting reader intelligence.'
    },
    {
      title: 'Inconsistent Voice',
      description: 'Switching between registers without purpose; losing yourself trying to sound literary.'
    },
    {
      title: 'Template Poetry',
      description: 'Filling in Mad Libs-style structures; formulaic approaches to "deep" subjects.'
    },
    {
      title: 'Performative Depth',
      description: 'Generic profundity that sounds meaningful but says nothing specific.'
    }
  ];

  switchTab(tab: 'green' | 'red'): void {
    this.activeTab = tab;
  }
}