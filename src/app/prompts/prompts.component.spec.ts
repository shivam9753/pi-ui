import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { PromptsComponent } from './prompts.component';

describe('PromptsComponent', () => {
  let component: PromptsComponent;
  let fixture: ComponentFixture<PromptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, PromptsComponent]
    }))
    .compileComponents();

    fixture = TestBed.createComponent(PromptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
