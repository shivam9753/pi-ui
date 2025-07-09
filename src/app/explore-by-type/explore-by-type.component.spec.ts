import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreByTypeComponent } from './explore-by-type.component';

describe('ExploreByTypeComponent', () => {
  let component: ExploreByTypeComponent;
  let fixture: ComponentFixture<ExploreByTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreByTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExploreByTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
