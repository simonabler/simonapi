import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MetricsSnapshot, SecuritySnapshot, StatsService } from './stats.service';
import { StatsDashboardComponent } from './stats-dashboard.component';

describe('StatsDashboardComponent', () => {
  let component: StatsDashboardComponent;
  let fixture: ComponentFixture<StatsDashboardComponent>;

  const statsMock: MetricsSnapshot = {
    startedAtIso: new Date().toISOString(),
    totalCount: 10,
    byRoute: [],
    daily: {},
  };

  const securityMock: SecuritySnapshot = {
    blocked: [],
  };

  const statsServiceMock = {
    getStats: jasmine.createSpy('getStats').and.returnValue(of(statsMock)),
    getSecurity: jasmine.createSpy('getSecurity').and.returnValue(of(securityMock)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsDashboardComponent],
      providers: [{ provide: StatsService, useValue: statsServiceMock }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatsDashboardComponent);
    component = fixture.componentInstance;
    component.autoRefresh = false;
    fixture.detectChanges();
    component.refresh();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
