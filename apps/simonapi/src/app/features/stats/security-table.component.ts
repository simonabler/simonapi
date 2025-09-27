import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BlockEntryView, StatsService } from './stats.service';
import { environment } from '../../../environments/environments';

@Component({
  selector: 'app-security-table',
  standalone: false,
  templateUrl: './security-table.component.html',
  styleUrls: ['./security-table.component.scss'],
})
export class SecurityTableComponent {
  @Input() data: BlockEntryView[] | null = [];
  @Output() refreshRequested = new EventEmitter<void>();

private readonly statsService = inject(StatsService);
  readonly showUnban = !environment.production || environment.allowUnbanButton === true;
  errorMessage: string | null = null;
  private readonly unbanLoading = new Map<string, boolean>();



  isLoading(ip: string): boolean {
    return this.unbanLoading.get(ip) ?? false;
  }

  formatMeta(meta?: Record<string, any>): string {
    if (!meta || Object.keys(meta).length === 0) {
      return 'n/a';
    }
    const json = JSON.stringify(meta);
    return json.length > 120 ? `${json.slice(0, 117)}...` : json;
  }

  onUnban(entry: BlockEntryView): void {
    if (!this.showUnban) {
      return;
    }
    this.unbanLoading.set(entry.ip, true);
    this.statsService
      .unban(entry.ip)
      .pipe(
        finalize(() => {
          this.unbanLoading.delete(entry.ip);
        })
      )
      .subscribe({
        next: () => {
          this.errorMessage = null;
          this.refreshRequested.emit();
        },
        error: (error) => {
          this.errorMessage = this.describeError(error);
        },
      });
  }

  trackByIp(_: number, item: BlockEntryView): string {
    return item.ip;
  }

  private describeError(error: unknown): string {
    if (!error) {
      return 'Unknown error';
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
    return 'Unknown error';
  }
}
