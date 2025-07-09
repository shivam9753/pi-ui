import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostScreenComponent } from './post-screen.component';

describe('PostScreenComponent', () => {
  let component: PostScreenComponent;
  let fixture: ComponentFixture<PostScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
