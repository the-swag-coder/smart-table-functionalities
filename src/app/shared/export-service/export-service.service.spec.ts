import { TestBed } from '@angular/core/testing';

import { ExportService } from './export-service.service';

describe('ExportServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ExportService = TestBed.get(ExportService);
    expect(service).toBeTruthy();
  });
});
