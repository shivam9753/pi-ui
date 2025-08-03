import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuidelinesOverlayComponent } from './guidelines-overlay.component';

describe('GuidelinesOverlayComponent', () => {
  let component: GuidelinesOverlayComponent;
  let fixture: ComponentFixture<GuidelinesOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidelinesOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuidelinesOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
