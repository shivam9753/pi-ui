import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SubmissionCardComponent } from './submission-card.component';

describe('SubmissionCardComponent', () => {
  let component: SubmissionCardComponent;
  let fixture: ComponentFixture<SubmissionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, SubmissionCardComponent]
    }))
    .compileComponents();

    fixture = TestBed.createComponent(SubmissionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
