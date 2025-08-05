import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ReadingInterfaceComponent } from './reading-interface.component';

describe('ReadingInterfaceComponent', () => {
  let component: ReadingInterfaceComponent;
  let fixture: ComponentFixture<ReadingInterfaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReadingInterfaceComponent]
    }))
    .compileComponents();

    fixture = TestBed.createComponent(ReadingInterfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
