import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorialGuidelinesComponent } from './editorial-guidelines.component';

describe('EditorialGuidelinesComponent', () => {
  let component: EditorialGuidelinesComponent;
  let fixture: ComponentFixture<EditorialGuidelinesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorialGuidelinesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorialGuidelinesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
