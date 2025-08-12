
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ContactQuestion {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-contact',
  imports: [FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})

export class ContactComponent {
  searchQuery = '';
  customQuestion = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  questions: ContactQuestion[] = [
    {
      question: 'How can I submit my content?',
      answer:
        'To submit your work, log into your account and navigate to the submission form under the "Submit Work" section. Complete all required fields and upload your content as prompted.',
    },
    {
      question: 'What content types are accepted?',
      answer:
        'We accept articles, essays, poetry, and other written works. Please select the content type that best represents your submission.',
    },
    {
      question: 'How long does the review process take?',
      answer:
        'Review times vary depending on submission volume, but typically take between 2 to 4 weeks. You can track the status in your dashboard.',
    },
    {
      question: 'Can I edit my submission after submitting?',
      answer:
        'You can edit your submission while it is still in draft or if revisions are requested. After final approval, edits are restricted.',
    },
    {
      question: 'Are there deadlines for submission?',
      answer:
        'Deadlines depend on ongoing calls for submissions or publication cycles. Please refer to announcements for current deadlines.',
    },
  ];

  filteredQuestions: ContactQuestion[] = [...this.questions];

  filterQuestions() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredQuestions = [...this.questions];
    } else {
      this.filteredQuestions = this.questions.filter((q) =>
        q.question.toLowerCase().includes(query) || q.answer.toLowerCase().includes(query)
      );
    }
    this.clearMessages();
  }

  submitCustomQuestion(event: Event) {
    event.preventDefault();
    if (!this.customQuestion.trim()) return;

    this.loading = true;
    this.clearMessages();

    // Mock sending delay
    setTimeout(() => {
      this.loading = false;
      // Simulate success response
      this.successMessage = 'Thank you for your question! We will respond shortly.';
      this.customQuestion = '';
    }, 1500);
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
