// submission-form.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, GoogleUser } from '../auth.service';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css'],
  imports: [ReactiveFormsModule, CommonModule]
})
export class SubmissionFormComponent implements OnInit {
  form: FormGroup;
  loggedInUser: GoogleUser | null = null;
  currentStep = 1;
  selectedType = '';
  
  submissionTypes = [
    { label: 'Poem', value: 'poem', icon: '📝', description: 'Verses, lyrics, free verse' },
    { label: 'Article', value: 'article', icon: '📰', description: 'News, opinion, research' },
    { label: 'Cinema Essay', value: 'cinema_essay', icon: '🎬', description: 'Film analysis, reviews' },
    { label: 'Prose', value: 'prose', icon: '📚', description: 'Short stories, narratives' }
  ];

  constructor(
    private fb: FormBuilder, 
    private backendService: BackendService, 
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      submissionType: ['', Validators.required],
      contents: this.fb.array([this.createContentGroup()]),
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loggedInUser = this.authService.getCurrentUser();
  }

  createContentGroup(): FormGroup {
    return this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      tags: ['']
    });
  }

  getContentControls() {
    return (this.form.controls['contents'] as FormArray).controls;
  }

  addContent() {
    const contents = this.form.controls['contents'] as FormArray;
    if (contents.length < 5) {
      contents.push(this.createContentGroup());
    }
  }

  removeContent(index: number) {
    const contents = this.form.controls['contents'] as FormArray;
    if (contents.length > 1) {
      contents.removeAt(index);
    }
  }

  prevStep() {
    this.currentStep--;
  }

  validateStep1(): boolean {
    if (!this.selectedType) {
      alert('Please select a submission type');
      return false;
    }
    return true;
  }

  validateStep2(): boolean {
    const contents = this.form.get('contents') as FormArray;
    this.form.controls["title"].setValue(contents.value[0].title);
    for (let i = 0; i < contents.length; i++) {
      const content = contents.at(i);
      if (!content.get('title')?.value?.trim() || !content.get('body')?.value?.trim()) {
        alert('Please fill in all content fields');
        return false;
      }
    }
    return true;
  }

  // Add these methods to your component class:

// Method to get display name for content type (plural)
getContentTypeDisplayName(): string {
  const typeMap: { [key: string]: string } = {
    'poem': 'Poems',
    'prose': 'Prose',
    'article': 'Article',
    'cinema_essay': 'Cinema Essay'
  };
  return typeMap[this.selectedType] || 'Content';
}

// Method to get display name for single content type
getSingleContentTypeDisplayName(): string {
  const typeMap: { [key: string]: string } = {
    'poem': 'Poem',
    'prose': 'Prose',
    'article': 'Article',
    'cinema_essay': 'Cinema Essay'
  };
  return typeMap[this.selectedType] || 'Content';
}

// Method to get display name for individual content items
getContentItemDisplayName(index: number): string {
  if (this.selectedType === 'poem') {
    return `Poem ${index}`;
  }
  return this.getSingleContentTypeDisplayName();
}

// Method to validate content before proceeding to step 3
isContentValid(): boolean {
  const contents = this.getContentControls();
  return contents.every(content => 
    content.get('title')?.valid && content.get('body')?.valid
  );
}

// Updated selectType method to clear content when type changes
selectType(type: string): void {
  if (this.selectedType !== type) {
    // Clear existing content when switching types
    const contentsArray = this.form.get('contents') as FormArray;
    contentsArray.clear();
    
    // Add default content based on type
    this.addContent();
  }
  
  this.selectedType = type;
  this.form.patchValue({ submissionType: type });
}

// Updated nextStep method to handle title auto-population
nextStep(): void {
  if (this.currentStep === 2) {
    // Auto-populate submission title from first content title
    const firstContentTitle = this.getContentControls()[0]?.get('title')?.value;
    if (firstContentTitle) {
      this.form.patchValue({ title: firstContentTitle });
    }
  }
  
  if (this.currentStep < 3) {
    this.currentStep++;
  }
}

  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  parseTags(tagString: string): string[] {
    return tagString
      ? tagString
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      : [];
  }

  getWordCount(contentIndex: number): number {
    const content = this.getContentControls()[contentIndex];
    const body = content.get('body')?.value || '';
    return this.countWords(body);
  }

  submitForm() {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.value;
    const submissionType = formValue.submissionType;

    const contents = formValue.contents.map((c: any) => ({
      title: c.title,
      body: c.body,
      type: submissionType,
      wordCount: this.countWords(c.body),
      tags: this.parseTags(c.tags)
    }));

    const submissionPayload = {
      userId: this.loggedInUser?.id,
      title: formValue.title,
      description: formValue.description,
      submissionType,
      contents,
      status: 'pending_review'
    };

    this.backendService.submitNewSubmission(submissionPayload).subscribe({
      next: (result) => {
        alert("Submission successful! Thank you for sharing your creative work.");
        this.resetForm();
      },
      error: (error) => {
        console.error('Submission error:', error);
        alert("There was an error submitting your work. Please try again.");
      }
    });
  }

  resetForm() {
    this.form.reset();
    this.currentStep = 1;
    this.selectedType = '';
    
    // Reset form array to have one content group
    const contents = this.form.controls['contents'] as FormArray;
    contents.clear();
    contents.push(this.createContentGroup());
  }
}