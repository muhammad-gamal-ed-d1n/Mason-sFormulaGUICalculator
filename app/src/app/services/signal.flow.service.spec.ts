import { TestBed } from '@angular/core/testing';

import { SignalFlowService } from './signal.flow.service';

describe('SignalFlowService', () => {
  let service: SignalFlowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignalFlowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
