import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LockApiService } from '../services/lock.api';
import { PublicLockItem } from '../models/lock.models';

@Component({
  selector: 'app-public-lock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-lock.component.html',
  styleUrls: ['./public-lock.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLockComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(LockApiService);
  private router = inject(Router);

  slug = signal<string | null>(null);
  token = signal<string | null>(null);
  locks = signal<PublicLockItem[] | null>(null);
  error = signal<string | null>(null);
  busy = signal<boolean>(false);

  validTo = signal<Date | null>(null);
  remaining = signal<number>(0); // seconds
  private timer: any;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const token = this.route.snapshot.queryParamMap.get('t');
    if (!slug || !token) {
      this.error.set('Fehlender Parameter. Bitte Link prüfen.');
      return;
    }
    this.slug.set(slug);
    this.token.set(token);
    this.loadLocks();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private loadLocks() {
    this.busy.set(true);
    this.api.getPublicLocks$(this.slug()!, this.token()!).subscribe({
      next: (res) => {
        this.locks.set(res.locks);
        const validTo = res.validTo ? new Date(res.validTo) : null;
        this.validTo.set(validTo);
        if (this.timer) clearInterval(this.timer);
        if (validTo) {
          this.updateRemaining();
          this.timer = setInterval(() => this.updateRemaining(), 1000);
        }
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(e.message || 'Fehler beim Laden');
        this.busy.set(false);
      },
    });
  }

  private updateRemaining() {
    const to = this.validTo();
    if (!to) return;
    const s = Math.max(0, Math.floor((to.getTime() - Date.now()) / 1000));
    this.remaining.set(s);
  }

  getRemainingLabel(): string {
    const s = this.remaining();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  // simple swipe/click
  private genNonce(): string {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.from(b)
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
  }

  open(lock: PublicLockItem) {
    if (!this.slug() || !this.token()) return;
    this.busy.set(true);
    this.api.openPublic$(this.slug()!, this.token()!, lock.id, this.genNonce()).subscribe({
      next: (res) => {
        this.busy.set(false);
        alert(res?.message || 'Öffnen angefordert');
      },
      error: (e) => {
        this.busy.set(false);
        alert(e?.message || 'Fehler beim Öffnen');
      },
    });
  }
}

