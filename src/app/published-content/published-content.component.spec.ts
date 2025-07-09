import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishedContentComponent } from './published-content.component';

describe('PublishedContentComponent', () => {
  let component: PublishedContentComponent;
  let fixture: ComponentFixture<PublishedContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishedContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublishedContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
