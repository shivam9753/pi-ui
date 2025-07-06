import { TestBed } from '@angular/core/testing';

import { ContentSubmissionService } from './content-submission.service';

describe('ContentSubmissionService', () => {
  let service: ContentSubmissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContentSubmissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
