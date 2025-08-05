import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ContentSubmissionService } from './content-submission.service';

describe('ContentSubmissionService', () => {
  let service: ContentSubmissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    }));
    service = TestBed.inject(ContentSubmissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
