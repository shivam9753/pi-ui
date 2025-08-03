import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishingInterfaceComponent } from './publishing-interface.component';

describe('PublishingInterfaceComponent', () => {
  let component: PublishingInterfaceComponent;
  let fixture: ComponentFixture<PublishingInterfaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishingInterfaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublishingInterfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
