import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeSelectionComponent } from './type-selection.component';

describe('TypeSelectionComponent', () => {
  let component: TypeSelectionComponent;
  let fixture: ComponentFixture<TypeSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypeSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
