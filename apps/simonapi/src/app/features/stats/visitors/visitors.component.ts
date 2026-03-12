import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  StatsService,
  VisitorSummary,
  VisitorDailyPoint,
  VisitorByApi,
  VisitorByCountry,
} from '../stats.service';

@Component({
  selector: 'app-visitors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visitors.component.html',
})
export class VisitorsComponent implements OnInit {
  private readonly svc = inject(StatsService);

  summary = signal<VisitorSummary | null>(null);
  daily   = signal<VisitorDailyPoint[]>([]);
  byApi   = signal<VisitorByApi[]>([]);
  byCountry = signal<VisitorByCountry[]>([]);

  loading  = signal(false);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.svc.getVisitorSummary().subscribe({
      next: s => this.summary.set(s),
      error: e => this.errorMsg.set(e?.error?.message ?? 'Failed to load visitor summary'),
    });

    this.svc.getVisitorDaily(30).subscribe({
      next: d => this.daily.set(d),
    });

    this.svc.getVisitorByApi().subscribe({
      next: a => this.byApi.set(a),
    });

    this.svc.getVisitorByCountry().subscribe({
      next: c => {
        this.byCountry.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Build a tiny inline sparkline from the last 14 daily points. */
  get sparklinePoints(): string {
    const pts = this.daily().slice(-14);
    if (!pts.length) return '';
    const max = Math.max(...pts.map(p => p.uniqueIps), 1);
    const w = 200;
    const h = 36;
    return pts
      .map((p, i) => {
        const x = Math.round((i / (pts.length - 1)) * w);
        const y = Math.round(h - (p.uniqueIps / max) * h);
        return `${x},${y}`;
      })
      .join(' ');
  }

  tierKeys(byTier: Record<string, number>): string[] {
    return Object.keys(byTier);
  }

  tierColor(tier: string): string {
    const map: Record<string, string> = {
      anonymous: '#94a3b8',
      free: '#22d3ee',
      pro: '#0ea5e9',
      industrial: '#f59e0b',
    };
    return map[tier] ?? '#94a3b8';
  }

  /** Format a country code to flag emoji */
  flagEmoji(code: string): string {
    if (!code || code === 'XX') return '🌐';
    return code.toUpperCase().replace(/./g, c =>
      String.fromCodePoint(127397 + c.charCodeAt(0))
    );
  }
}
