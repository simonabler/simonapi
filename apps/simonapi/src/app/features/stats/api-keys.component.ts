import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiKeyRecord, ApiKeyTier, ApiKeysService, CreateApiKeyDto } from './api-keys.service';
import { StatsService } from './stats.service';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './api-keys.component.html',
})
export class ApiKeysComponent implements OnInit {
  private readonly svc = inject(ApiKeysService);
  readonly statsService = inject(StatsService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly keys = signal<ApiKeyRecord[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Create form
  readonly creating = signal(false);
  readonly newLabel = signal('');
  readonly newTier = signal<ApiKeyTier>('free');
  readonly newExpiry = signal('');
  readonly createdRawKey = signal<string | null>(null);
  readonly createError = signal<string | null>(null);

  // Revoke state
  readonly revoking = signal<string | null>(null);
  readonly confirmRevoke = signal<string | null>(null);

  readonly tiers: ApiKeyTier[] = ['free', 'pro', 'industrial'];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list().subscribe({
      next: (keys) => { this.keys.set(keys); this.loading.set(false); },
      error: (err) => {
        this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load keys');
        this.loading.set(false);
      },
    });
  }

  submitCreate(): void {
    const label = this.newLabel().trim();
    if (!label) return;
    this.creating.set(true);
    this.createError.set(null);
    this.createdRawKey.set(null);

    const dto: CreateApiKeyDto = { label, tier: this.newTier() };
    if (this.newExpiry()) dto.expiresAt = new Date(this.newExpiry()).toISOString();

    this.svc.create(dto).subscribe({
      next: (res) => {
        this.createdRawKey.set(res.rawKey);
        this.newLabel.set('');
        this.newTier.set('free');
        this.newExpiry.set('');
        this.creating.set(false);
        this.load();
      },
      error: (err) => {
        this.createError.set(err?.error?.message ?? 'Failed to create key');
        this.creating.set(false);
      },
    });
  }

  startRevoke(id: string): void {
    this.confirmRevoke.set(id);
  }

  cancelRevoke(): void {
    this.confirmRevoke.set(null);
  }

  confirmRevokeKey(id: string): void {
    this.revoking.set(id);
    this.confirmRevoke.set(null);
    this.svc.revoke(id).subscribe({
      next: () => { this.revoking.set(null); this.load(); },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to revoke key');
        this.revoking.set(null);
      },
    });
  }

  copyKey(key: string): void {
    navigator.clipboard?.writeText(key);
  }

  dismissRawKey(): void {
    this.createdRawKey.set(null);
  }

  onApiKeyChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.statsService.setApiKey(val);
    this.load();
  }

  tierBadgeClass(tier: ApiKeyTier): string {
    return {
      free:       'bg-secondary-subtle text-secondary border-secondary-subtle',
      pro:        'bg-primary-subtle text-primary border-primary-subtle',
      industrial: 'bg-warning-subtle text-warning border-warning-subtle',
    }[tier];
  }

  activeBadge(active: boolean): string {
    return active
      ? 'bg-success-subtle text-success border-success-subtle'
      : 'bg-danger-subtle text-danger border-danger-subtle';
  }
}
