import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from './stats.service';

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- ── Admin API Key gate ─────────────────────────────────────────────── -->
    <div class="container py-4">
      <div class="card border-0 shadow-sm mb-0">
        <div class="card-body d-flex align-items-center gap-3 flex-wrap">
          <span class="fw-semibold text-body-secondary small text-uppercase letter-spacing-1">Admin API Key</span>
          <input
            type="password"
            class="form-control form-control-sm"
            style="max-width:320px"
            placeholder="sk_ind_…"
            [value]="svc.apiKey()"
            (input)="svc.setApiKey($any($event.target).value)"
            autocomplete="off"
          />
          @if (svc.apiKey()) {
            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small">Key set</span>
          } @else {
            <span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 small">No key</span>
          }
        </div>
      </div>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────────────────────── -->
    <div class="container">
      <ul class="nav nav-tabs border-bottom mb-0">
        <li class="nav-item">
          <a class="nav-link" routerLink="/admin/stats" routerLinkActive="active">📊 Stats</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" routerLink="/admin/api-keys" routerLinkActive="active">🔑 API Keys</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" routerLink="/admin/visitors" routerLinkActive="active">👥 Visitors</a>
        </li>
      </ul>
    </div>
  `,
})
export class AdminNavComponent {
  readonly svc = inject(StatsService);
}
