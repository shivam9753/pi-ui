import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewSubmissionComponent } from './review-submission.component';

describe('ReviewSubmissionComponent', () => {
  let component: ReviewSubmissionComponent;
  let fixture: ComponentFixture<ReviewSubmissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewSubmissionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewSubmissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
