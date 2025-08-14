import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { themeKeywords } from '../../shared/const';

interface ParsedPoem {
  id: number;
  text: string;
  quality: number;
  style: string;
  themes: string[];
  plagiarism: number;
  notes: string;
  added_date: string;
  author: string;
}

@Component({
  selector: 'app-poem-parser',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-white p-8">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Poem Parser</h1>
    
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Input Section -->
          <div>
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Input Text</h2>
            <textarea
              [(ngModel)]="inputText"
              class="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
              placeholder="Paste your poems here. Each poem should start with ## followed by the title..."
            ></textarea>
    
            <div class="mt-4 flex gap-4">
              <button
                (click)="parsePoems()"
                [disabled]="!inputText.trim()"
                class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Parse Poems
              </button>
    
              <button
                (click)="clearAll()"
                class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                Clear All
              </button>
            </div>
          </div>
    
          <!-- Output Section -->
          <div>
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-900">JSON Output</h2>
              <div class="flex gap-2">
                <button
                  (click)="copyToClipboard()"
                  [disabled]="!jsonOutput"
                  class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                  Copy JSON
                </button>
                <button
                  (click)="downloadJson()"
                  [disabled]="!jsonOutput"
                  class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                  Download JSON
                </button>
              </div>
            </div>
    
            <div class="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
              <pre class="text-sm text-gray-800 whitespace-pre-wrap">{{ jsonOutput || 'Parsed JSON will appear here...' }}</pre>
            </div>
    
            <div class="mt-4 text-sm text-gray-600">
              <p><strong>Found:</strong> {{ parsedPoems.length }} poem(s)</p>
              @if (parsedPoems.length > 0) {
                <p><strong>Total characters:</strong> {{ jsonOutput.length }}</p>
              }
            </div>
          </div>
        </div>
    
        <!-- Instructions -->
        <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-blue-900 mb-3">Instructions</h3>
          <ul class="text-blue-800 space-y-2">
            <li>• Each poem should start with <code class="bg-blue-100 px-1 rounded">##</code> followed by the title</li>
            <li>• Include author information after the title (format: <code class="bg-blue-100 px-1 rounded">- Author Name</code>)</li>
            <li>• The parser will automatically generate IDs, quality scores, themes, and other metadata</li>
            <li>• Output will be in JSON format ready for import/export</li>
          </ul>
        </div>
      </div>
    </div>
    `
})
export class PoemParserComponent {
  inputText = '';
  jsonOutput = '';
  parsedPoems: ParsedPoem[] = [];

  parsePoems() {
    this.parsedPoems = [];
    
    if (!this.inputText.trim()) return;

    // Split by ## to separate poems
    const sections = this.inputText.split('##').filter(section => section.trim());
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      if (lines.length === 0) return;

      // Extract title (first line)
      const titleLine = lines[0].trim();
      
      // Extract author (look for line starting with -)
      let author = 'Unknown Author';
      let contentStartIndex = 1;
      
      for (let i = 1; i < Math.min(lines.length, 5); i++) {
        const line = lines[i].trim();
        if (line.startsWith('-') || line.startsWith('by ')) {
          author = line.replace(/^[-by]\s*/, '').trim();
          contentStartIndex = i + 1;
          break;
        }
      }

      // Extract poem content
      const poemContent = lines.slice(contentStartIndex).join('\n').trim();
      
      if (!poemContent) return;

      // Generate themes based on content
      const themes = this.generateThemes(titleLine + ' ' + poemContent);
      
      const quality = this.calculateQuality(poemContent, themes);
      
      const poem: ParsedPoem = {
        id: Math.floor(Math.random() * 1000000) + index,
        text: poemContent,
        quality: quality,
        style: this.detectStyle(poemContent),
        themes: themes,
        plagiarism: Math.floor(Math.random() * 10), // 0-9
        notes: this.generateNotes(titleLine, poemContent, themes, quality),
        added_date: new Date().toISOString(),
        author: author
      };

      this.parsedPoems.push(poem);
    });

    this.jsonOutput = JSON.stringify(this.parsedPoems[0 ], null, 2);
  }

  generateThemes(content: string): string[] {
    const contentLower = content.toLowerCase();
    const themeScores: { [key: string]: number } = {};

    // Score themes based on weighted keyword frequency
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      let score = 0;
      keywords.forEach((keywordObj: any) => {
        // Skip if keywordObj is invalid
        if (!keywordObj || !keywordObj.word || !keywordObj.weight) {
          return;
        }
        
        const keyword = keywordObj.word;
        const weight = keywordObj.weight;
        
        // Count occurrences of each keyword
        const regex = new RegExp(`\\b${keyword.replace(/[-]/g, '[-\\s]')}\\b`, 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          // Score = frequency × weight
          score += matches.length * weight;
        }
      });
      
      if (score > 0) {
        themeScores[theme] = score;
      }
    });

    // Sort themes by weighted score and return top themes
    const sortedThemes = Object.entries(themeScores)
      .sort(([,a], [,b]) => b - a)
      .map(([theme]) => theme);

    // Return top 3-5 themes, with minimum of 2
    const selectedThemes = sortedThemes.slice(0, Math.min(5, Math.max(2, sortedThemes.length)));
    
    // Default themes if none found
    if (selectedThemes.length === 0) {
      selectedThemes.push('Life', 'Reflection');
    }

    return selectedThemes;
  }

  calculateQuality(content: string, themes: string[]): number {
    let qualityScore = 7.0; // Base score
    const contentLower = content.toLowerCase();
    const wordCount = content.split(/\s+/).length;
    
    // Length and structure analysis
    if (wordCount > 100) qualityScore += 0.3;
    if (wordCount > 200) qualityScore += 0.3;
    if (wordCount < 20) qualityScore -= 0.3;
    
    // Sophisticated vocabulary (weight 7+ keywords)
    let sophisticationScore = 0;
    let highWeightKeywordsFound = 0;
    
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      keywords.forEach((keywordObj: any) => {
        if (!keywordObj || !keywordObj.word || !keywordObj.weight) return;
        
        if (keywordObj.weight >= 7 && contentLower.includes(keywordObj.word)) {
          sophisticationScore += 0.2;
          highWeightKeywordsFound++;
        }
      });
    });
    
    qualityScore += Math.min(sophisticationScore, 1.0);
    
    // Imagery and specificity indicators
    let imageryScore = 0;
    const imageryIndicators = [
      // Sensory details
      'scent', 'aroma', 'fragrance', 'taste', 'touch', 'texture', 'sound', 'echo',
      // Visual imagery
      'glow', 'shimmer', 'shadow', 'silhouette', 'gleam', 'flicker', 'gaze', 'stare',
      // Specific cultural/place references
      'bollywood', 'ranchi', 'kumartuli', 'khajuraho', 'konark', 'peepal', 'marigold', 'jasmine', 'champa',
      // Emotional complexity markers
      'paradox', 'contradiction', 'juxtaposition', 'irony', 'ambivalence',
      // Craft indicators
      'rhythm', 'cadence', 'line break', 'stanza', 'verse', 'refrain'
    ];
    
    imageryIndicators.forEach(indicator => {
      if (contentLower.includes(indicator)) imageryScore += 0.15;
    });
    
    qualityScore += Math.min(imageryScore, 1.2);
    
    // Metaphorical language detection
    let metaphorScore = 0;
    const metaphorPatterns = [
      /like a .+/gi,           // "like a pebble"
      /as .+ as/gi,            // "as white as"
      /\w+ is \w+/gi,          // "time is money"
      /transformed into/gi,     // "transformed into"
      /became/gi,              // "became"
      /turns into/gi           // "turns into"
    ];
    
    metaphorPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) metaphorScore += matches.length * 0.1;
    });
    
    qualityScore += Math.min(metaphorScore, 0.8);
    
    // Theme diversity (always reward good thematic range)
    if (themes.length >= 3) qualityScore += 0.2;
    if (themes.length >= 4) qualityScore += 0.2;
    
    // Authentic voice indicators (personal pronouns, cultural specificity)
    let authenticityScore = 0;
    const authenticityMarkers = ['my', 'i ', 'me', 'grandmother', 'mother', 'father', 'home', 'childhood'];
    authenticityMarkers.forEach(marker => {
      if (contentLower.includes(marker)) authenticityScore += 0.05;
    });
    
    qualityScore += Math.min(authenticityScore, 0.6);
    
    // Only apply generic penalty if NO sophisticated elements found
    if (highWeightKeywordsFound === 0 && imageryScore === 0 && metaphorScore === 0 && wordCount < 50) {
      qualityScore -= 0.3;
    }
    
    // Cap between 7.0-10.0 (raised minimum for better poems)
    return Math.round(Math.min(Math.max(qualityScore, 7.0), 10.0) * 10) / 10;
  }

  detectStyle(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    
    // Simple style detection
    if (avgLineLength > 80) return 'prose poem';
    if (lines.length <= 4) return 'haiku';
    if (content.match(/\b(rhyme|rhythm|meter)\b/i)) return 'traditional verse';
    return 'free verse';
  }

  generateNotes(title: string, content: string, themes: string[], quality: number): string {
    const contentLower = content.toLowerCase();
    const wordCount = content.split(/\s+/).length;
    
    // Analyze sophistication level
    let sophisticatedTerms: string[] = [];
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (themes.includes(theme)) {
        keywords.forEach((keywordObj: any) => {
          if (keywordObj.weight >= 7 && contentLower.includes(keywordObj.word)) {
            sophisticatedTerms.push(keywordObj.word);
          }
        });
      }
    });

    // Generate contextual notes
    let notes = `This poem explores ${themes.join(', ').toLowerCase()}, `;
    
    if (sophisticatedTerms.length > 0) {
      notes += `employing sophisticated terminology and concepts. The use of terms like "${sophisticatedTerms.slice(0, 2).join('" and "')}" demonstrates depth and specificity in the thematic treatment. `;
    } else {
      notes += `using accessible language that connects with universal human experiences. `;
    }
    
    if (quality >= 8.5) {
      notes += 'The piece demonstrates exceptional literary merit with rich imagery, emotional authenticity, and sophisticated thematic development.';
    } else if (quality >= 8.0) {
      notes += 'The poem shows strong literary qualities with effective use of language and well-developed themes.';
    } else if (quality >= 7.5) {
      notes += 'A solid piece with clear thematic focus and competent use of poetic techniques.';
    } else {
      notes += 'The work shows potential with room for further development in imagery and thematic complexity.';
    }
    
    if (wordCount > 150) {
      notes += ' The extended length allows for comprehensive exploration of the subject matter.';
    }
    
    return notes;
  }

  clearAll() {
    this.inputText = '';
    this.jsonOutput = '';
    this.parsedPoems = [];
  }

  async copyToClipboard() {
    if (!this.jsonOutput) return;
    
    try {
      await navigator.clipboard.writeText(this.jsonOutput[0]);
      alert('JSON copied to clipboard!');
    } catch (err) {
    }
  }

  downloadJson() {
    if (!this.jsonOutput) return;

    const blob = new Blob([this.jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parsed-poems-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}