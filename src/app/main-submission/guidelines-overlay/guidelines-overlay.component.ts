import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorialGuidelinesComponent } from './editorial-guidelines/editorial-guidelines.component';

@Component({
  selector: 'app-guidelines-overlay',
  imports: [CommonModule, EditorialGuidelinesComponent],
  templateUrl: './guidelines-overlay.component.html',
  styleUrl: './guidelines-overlay.component.css'
})
export class GuidelinesOverlayComponent {
  @Input() isInline: boolean = false;
  @Output() close = new EventEmitter<void>();
  greenFlags = [
  {
    label: 'Authentic Voice',
    description: 'Poems that sound like an actual person, not “A Poet” — natural speech patterns and genuine personality.'
  },
  {
    label: 'Lived Specificity',
    description: 'Concrete details from real experience — your grandmother’s exact kitchen, not generic “elderly wisdom.”'
  },
  {
    label: 'Productive Messiness',
    description: 'Beautiful imperfection where language struggles in interesting ways and creates unexpected meaning.'
  },
  {
    label: 'Risk-Taking',
    description: 'A willingness to fail interestingly — through form, subject, or approach.'
  },
  {
    label: 'Emotional Complexity',
    description: 'Feelings that resist easy labels — love mixed with resentment, joy tinged with fear.'
  },
  {
    label: 'Fresh Imagery',
    description: 'Original metaphors that surprise rather than decorate; connections we haven’t seen before.'
  },
  {
    label: 'Cultural Specificity',
    description: 'Details that reveal your actual world, background, and lived context.'
  },
  {
    label: 'Natural Line Breaks',
    description: 'Line breaks that serve meaning and breath, not just visual “poeticness.”'
  },
  {
    label: 'Earned Difficulty',
    description: 'Complexity that serves the poem’s needs rather than showing off.'
  },
  {
    label: 'Surprising Turns',
    description: 'Moments that surprise even the writer — unexpected but inevitable in hindsight.'
  }
];
redFlags = [
  {
    label: 'AI-Generated Perfection',
    description: 'Technically flawless but emotionally hollow — smooth, safe, and soulless.'
  },
  {
    label: 'Manufactured Metaphors',
    description: 'Forced comparisons chosen for cleverness rather than emotional truth.'
  },
  {
    label: 'Metaphor Overload',
    description: 'Too many competing images that muddy meaning instead of sharpening it.'
  },
  {
    label: 'Direct Plagiarism',
    description: 'Copying others’ lines, structures, or ideas — we notice and we check.'
  },
  {
    label: 'Concept Theft',
    description: 'Stealing distinctive approaches or structures while changing surface language.'
  },
  {
    label: 'Clichéd Language',
    description: 'Overused phrases and images — roses, glass hearts, rain dances, time healing wounds.'
  },
  {
    label: 'Purple Prose',
    description: 'Overly ornate language prioritizing “sounding poetic” over clarity and meaning.'
  },
  {
    label: 'Vague Abstraction',
    description: 'Heavy use of words like “soul,” “beauty,” or “eternity” without grounding detail.'
  },
  {
    label: 'Forced Rhyme',
    description: 'Twisting syntax or weakening word choice just to maintain rhyme.'
  },
  {
    label: 'Emotional Telling',
    description: 'Declaring emotions (“I was sad”) instead of creating experiences that evoke them.'
  },
  {
    label: 'Heavy-Handed Symbolism',
    description: 'Over-explaining symbols; not trusting the reader’s intelligence.'
  },
  {
    label: 'Inconsistent Voice',
    description: 'Switching registers without purpose; losing yourself while trying to sound literary.'
  },
  {
    label: 'Template Poetry',
    description: 'Formulaic, Mad-Libs-style poems that imitate depth instead of earning it.'
  },
  {
    label: 'Performative Depth',
    description: 'Generic profundity that sounds meaningful but says nothing specific.'
  }
];

  
  activeTab: 'green' | 'red' = 'green';

  closeOverlay(event: any): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  switchTab(tab: 'green' | 'red'): void {
    this.activeTab = tab;
  }
}
