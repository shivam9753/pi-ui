import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminReviewSubmissionComponent } from './admin-review-submission.component';

describe('AdminReviewSubmissionComponent', () => {
  let component: AdminReviewSubmissionComponent;
  let fixture: ComponentFixture<AdminReviewSubmissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReviewSubmissionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminReviewSubmissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
