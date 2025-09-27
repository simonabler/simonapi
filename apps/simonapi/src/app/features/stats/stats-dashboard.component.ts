import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, forkJoin, merge, of, timer } from 'rxjs';
import { catchError, filter, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { MetricsSnapshot, RouteStats, SecuritySnapshot, StatsService } from './stats.service';
import { StatsCardComponent } from './stats-card.component';
import { SecurityTableComponent } from './security-table.component';
import { DurationPipe } from './duration.pipe';
import { IsoDatePipe } from './iso-date.pipe';

interface ViewModel {
  loading: boolean;
  stats: MetricsSnapshot | null;
  statsError: string | null;
  security: SecuritySnapshot | null;
  securityError: string | null;
  uptimeMs: number | null;
  startedRelative: string;
}

@Component({
  selector: 'app-stats-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatsCardComponent,
    SecurityTableComponent,
    DurationPipe,
    IsoDatePipe,
  ],
  templateUrl: './stats-dashboard.component.html',
  styleUrls: ['./stats-dashboard.component.scss'],
})
export class StatsDashboardComponent implements OnDestroy {
  autoRefresh = true;
  private readonly refresh$ = new Subject<void>();
  private readonly initialState: ViewModel;
  private readonly isBrowser: boolean;

    private readonly platformId = inject(PLATFORM_ID);
      private readonly statsService = inject(StatsService);
  readonly vm$: Observable<ViewModel>;

  constructor(
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.autoRefresh = this.isBrowser;
    this.initialState = {
      loading: this.isBrowser,
      stats: null,
      statsError: null,
      security: null,
      securityError: null,
      uptimeMs: null,
      startedRelative: '-',
    };

    this.vm$ = this.isBrowser ? this.createClientStream() : of(this.initialState);
  }

  refresh(): void {
    if (!this.isBrowser) {
      return;
    }
    this.refresh$.next();
  }

  onAutoRefreshChange(value: boolean): void {
    if (!this.isBrowser) {
      return;
    }
    this.autoRefresh = value;
    if (value) {
      this.refresh();
    }
  }

  topRoutes(stats: MetricsSnapshot | null): RouteStats[] {
    if (!stats?.byRoute?.length) {
      return [];
    }
    return [...stats.byRoute]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  distinctRoutes(stats: MetricsSnapshot | null): number {
    return stats?.byRoute?.length ?? 0;
  }

  dominantStatus(route: RouteStats): string {
    const entries = Object.entries(route.statuses ?? {});
    if (!entries.length) {
      return 'n/a';
    }
    const [code, count] = entries.reduce((acc, curr) => (curr[1] > acc[1] ? curr : acc));
    return `${code} (${count})`;
  }

  dailyEntries(stats: MetricsSnapshot | null): Array<{ day: string; count: number; percent: number }> {
    if (!stats?.daily) {
      return [];
    }
    const entries = Object.entries(stats.daily).map(([day, count]) => ({ day, count }));
    if (!entries.length) {
      return [];
    }
    const max = Math.max(...entries.map((entry) => entry.count));
    return entries
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((entry) => ({ ...entry, percent: max > 0 ? Math.round((entry.count / max) * 100) : 0 }));
  }

  trackByRoute(_: number, item: RouteStats): string {
    return item.route;
  }

  ngOnDestroy(): void {
    this.refresh$.complete();
  }

  private createClientStream(): Observable<ViewModel> {
    return merge(
      timer(0, 5000).pipe(filter(() => this.autoRefresh)),
      this.refresh$,
    ).pipe(
      switchMap(() => this.loadSnapshots()),
      startWith(this.initialState),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  private loadSnapshots(): Observable<ViewModel> {
    const loadingState: ViewModel = {
      loading: true,
      stats: null,
      statsError: null,
      security: null,
      securityError: null,
      uptimeMs: null,
      startedRelative: '�',
    };

    return forkJoin({
      stats: this.statsService.getStats().pipe(
        map((data) => ({ data, error: null as string | null })),
        catchError((error) => of({ data: null, error: this.describeError(error) }))
      ),
      security: this.statsService.getSecurity().pipe(
        map((data) => ({ data, error: null as string | null })),
        catchError((error) => of({ data: null, error: this.describeError(error) }))
      ),
    }).pipe(
      map(({ stats, security }): ViewModel => {
        const startedAtIso = stats.data?.startedAtIso ?? null;
        return {
          loading: false,
          stats: stats.data,
          statsError: stats.error,
          security: security.data,
          securityError: security.error,
          uptimeMs: this.computeUptime(startedAtIso),
          startedRelative: this.computeRelativeFromNow(startedAtIso),
        };
      }),
      startWith(loadingState),
    );
  }

  private computeUptime(startedAtIso: string | null): number | null {
    if (!startedAtIso) {
      return null;
    }
    const started = new Date(startedAtIso).getTime();
    if (Number.isNaN(started)) {
      return null;
    }
    return Math.max(0, Date.now() - started);
  }

  private computeRelativeFromNow(iso: string | null): string {
    if (!iso) {
      return '�';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '�';
    }
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) {
      return '�';
    }
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}d ${hours % 24}h ago`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s ago`;
    }
    return `${seconds}s ago`;
  }

  private describeError(error: unknown): string {
    if (!error) {
      return 'Unbekannter Fehler';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && 'message' in (error as any)) {
      return String((error as any).message);
    }
    return 'Unbekannter Fehler';
  }
}
