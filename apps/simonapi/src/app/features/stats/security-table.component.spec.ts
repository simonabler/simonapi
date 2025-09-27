import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DurationPipe } from './duration.pipe';
import { IsoDatePipe } from './iso-date.pipe';
import { BlockEntryView, StatsService } from './stats.service';
import { SecurityTableComponent } from './security-table.component';

describe('SecurityTableComponent', () => {
  let component: SecurityTableComponent;
  let fixture: ComponentFixture<SecurityTableComponent>;

  const statsServiceMock = {
    unban: jasmine.createSpy('unban').and.returnValue(of(void 0)),
  };

  const sample: BlockEntryView[] = [
    {
      ip: '127.0.0.1',
      reason: 'Too many requests',
      strikes: 2,
      remainingMs: 1000,
      until: Date.now(),
      meta: { userAgent: 'jest' },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, DurationPipe, IsoDatePipe],
      declarations: [SecurityTableComponent],
      providers: [{ provide: StatsService, useValue: statsServiceMock }],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SecurityTableComponent);
    component = fixture.componentInstance;
    component.data = sample;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
