import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SubmissionFormComponent } from './submission-form.component';

describe('SubmissionFormComponent', () => {
  let component: SubmissionFormComponent;
  let fixture: ComponentFixture<SubmissionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, SubmissionFormComponent]
    }))
    .compileComponents();

    fixture = TestBed.createComponent(SubmissionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
