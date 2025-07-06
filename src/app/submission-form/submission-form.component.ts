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

  selectType(type: string) {
    this.selectedType = type;
    this.form.patchValue({ submissionType: type });
    
    // For non-poem types, reset to 1 content
    const contents = this.form.controls['contents'] as FormArray;
    if (type !== 'poem') {
      while (contents.length > 1) contents.removeAt(1);
    }
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (!this.validateStep1()) return;
    } else if (this.currentStep === 2) {
      if (!this.validateStep2()) return;
    }
    
    this.currentStep++;
  }

  prevStep() {
    this.currentStep--;
  }

  validateStep1(): boolean {
    const title = this.form.get('title')?.value?.trim();
    if (!title) {
      alert('Please enter a title for your submission');
      return false;
    }
    if (!this.selectedType) {
      alert('Please select a submission type');
      return false;
    }
    return true;
  }

  validateStep2(): boolean {
    const contents = this.form.get('contents') as FormArray;
    for (let i = 0; i < contents.length; i++) {
      const content = contents.at(i);
      if (!content.get('title')?.value?.trim() || !content.get('body')?.value?.trim()) {
        alert('Please fill in all content fields');
        return false;
      }
    }
    return true;
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