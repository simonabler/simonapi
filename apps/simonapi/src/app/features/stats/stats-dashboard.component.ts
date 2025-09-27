import { Component, OnDestroy } from '@angular/core';
import { Observable, Subject, forkJoin, merge, of, timer } from 'rxjs';
import { catchError, filter, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { MetricsSnapshot, RouteStats, SecuritySnapshot, StatsService } from './stats.service';

interface ViewModel {
  loading: boolean;
  stats: MetricsSnapshot | null;
  statsError: string | null;
  security: SecuritySnapshot | null;
  securityError: string | null;
}

@Component({
  selector: 'app-stats-dashboard',
  standalone: false,
  templateUrl: './stats-dashboard.component.html',
  styleUrls: ['./stats-dashboard.component.scss'],
})
export class StatsDashboardComponent implements OnDestroy {
  autoRefresh = true;
  private readonly refresh$ = new Subject<void>();

  readonly vm$ = merge(
    timer(0, 5000).pipe(filter(() => this.autoRefresh)),
    this.refresh$
  ).pipe(
    switchMap(() => this.loadSnapshots()),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(private readonly statsService: StatsService) {}

  refresh(): void {
    this.refresh$.next();
  }

  onAutoRefreshChange(value: boolean): void {
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

  uptimeMs(stats: MetricsSnapshot | null): number | null {
    if (!stats?.startedAtIso) {
      return null;
    }
    const started = new Date(stats.startedAtIso).getTime();
    if (Number.isNaN(started)) {
      return null;
    }
    return Math.max(0, Date.now() - started);
  }

  relativeFromNow(iso?: string | null): string {
    if (!iso) {
      return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) {
      return '—';
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

  private loadSnapshots(): Observable<ViewModel> {
    const loadingState: ViewModel = {
      loading: true,
      stats: null,
      statsError: null,
      security: null,
      securityError: null,
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
      map(({ stats, security }): ViewModel => ({
        loading: false,
        stats: stats.data,
        statsError: stats.error,
        security: security.data,
        securityError: security.error,
      })),
      startWith(loadingState)
    );
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
