import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AuthorReviewSubmissionComponent } from './author-review-submission.component';

describe('AuthorReviewSubmissionComponent', () => {
  let component: AuthorReviewSubmissionComponent;
  let fixture: ComponentFixture<AuthorReviewSubmissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, AuthorReviewSubmissionComponent]
    }))
    .compileComponents();

    fixture = TestBed.createComponent(AuthorReviewSubmissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
