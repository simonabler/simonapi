import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

type ServiceCard = {
  key: string;
  title: string;
  description: string;
  route?: string;
  apiTitle: string;
  curl: string;
  activeTab: 'info' | 'api';
};

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  template: `
<section class="hero rounded-4 p-4 p-lg-5 mb-4 text-white shadow-sm">
  <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-3">
    <div class="flex-fill">
      <h1 class="display-6 fw-semibold mb-2">simonapi</h1>
      <p class="lead mb-3">Ein schlankes Frontend, um deine NestJS-Services zu entdecken, auszuprobieren (QR, Dev-Utils) und via cURL direkt zu nutzen.</p>
      <div class="d-flex gap-2 flex-wrap">
        <a routerLink="/qr" class="btn btn-light text-dark">QR Code Editor öffnen</a>
        <a href="/api/docs" target="_blank" rel="noopener" class="btn btn-outline-light">API Docs</a>
      </div>
    </div>
  </div>
</section>

<!-- Profil vor den Services -->
<section class="profile card border-0 shadow-sm mb-4">
  <div class="card-body d-flex align-items-center gap-3">
    <div class="avatar fw-semibold">{{ avatarInitials }}</div>
    <div class="flex-fill">
      <h2 class="h5 mb-1">{{ profile.name }}</h2>
      <p class="text-secondary mb-2">{{ profile.role }} · {{ profile.location }}</p>
      <p class="mb-2 small text-secondary">{{ profile.bio }}</p>
      <div class="d-flex gap-2 flex-wrap">
        <a *ngFor="let l of profile.links" class="btn btn-sm btn-outline-secondary" [href]="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
      </div>
    </div>
  </div>
  
</section>

<section>
  <h2 class="h4 mb-3">Services</h2>
  <div class="row g-3">
    <div class="col-12 col-lg-6" *ngFor="let s of services">
      <div class="card service-card shadow-sm h-100">
        <div class="card-header bg-transparent border-0 pb-0 d-flex align-items-center justify-content-between">
          <h3 class="h5 m-0">{{ s.title }}</h3>
          <ul class="nav nav-pills small">
            <li class="nav-item"><a class="nav-link" [class.active]="s.activeTab==='info'" (click)="s.activeTab='info'">Info</a></li>
            <li class="nav-item"><a class="nav-link" [class.active]="s.activeTab==='api'" (click)="s.activeTab='api'">API</a></li>
          </ul>
        </div>
        <div class="card-body">
          <ng-container *ngIf="s.activeTab==='info'; else apiTpl">
            <p class="text-secondary mb-3">{{ s.description }}</p>
            <a *ngIf="s.route" [routerLink]="s.route" class="btn btn-primary btn-sm">Jetzt ausprobieren</a>
          </ng-container>
          <ng-template #apiTpl>
            <div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <strong>{{ s.apiTitle }}</strong>
                <button class="btn btn-outline-secondary btn-sm" (click)="copy(s.curl)">Copy</button>
              </div>
              <pre class="code"><code>{{ s.curl }}</code></pre>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  </div>
</section>

`,
  styles: [`
  .hero { background: linear-gradient(135deg, var(--brand-2), var(--brand)); }
  .service-card .nav-link { cursor: pointer; }
  .service-card .nav-pills .nav-link.active { background: linear-gradient(135deg, var(--brand-2), var(--brand)); }
  .code { background: #0f172a; color: #e2e8f0; border-radius: .5rem; padding: .75rem; overflow: auto; }
  .code code { white-space: pre-wrap; word-break: break-word; }
  .profile .avatar { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #22d3ee, #818cf8); color: #0b1020; }
  .profile { backdrop-filter: saturate(1.2); }
  `],
})
export class HomeComponent {
  profile = {
    name: 'Dein Name',
    role: 'Software Engineer',
    location: 'Your City',
    bio: 'Ich baue APIs, Frontends und Dev-Tools mit Fokus auf Developer Experience.',
    links: [
      { label: 'GitHub', href: 'https://github.com/' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
    ],
  };
  get avatarInitials() {
    const n = this.profile.name?.trim() || '';
    const parts = n.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
    return initials || 'DN';
  }
  services: ServiceCard[] = [
    {
      key: 'qr',
      title: 'QR Code Service',
      description: 'Erzeuge QR Codes aus URL, Text, E-Mail, Telefon, SMS, vCard oder WLAN. Export als PNG/SVG – ideal für Sharing & Druck.',
      route: '/qr',
      apiTitle: 'POST /api/qr',
      curl: `curl -X POST http://localhost:3000/api/qr -H "Content-Type: application/json" -d '{"type":"url","payload":{"url":"https://example.com"},"format":"svg","size":512,"margin":2,"ecc":"M"}'`,
      activeTab: 'info',
    },
    // Dev/Utility – Einzelkarten
    {
      key: 'echo',
      title: 'Echo/IP-API',
      description: 'Gibt Client-IP, Headers und User-Agent zurück – ideal zum Debuggen von Proxies und Requests.',
      route: '/dev-utils',
      apiTitle: 'GET /api/utils/echo',
      curl: `curl http://localhost:3000/api/utils/echo`,
      activeTab: 'info',
    },
    {
      key: 'id',
      title: 'UUID/ULID-Generator',
      description: 'Generiert IDs (ULID oder UUID) für Tests, Seeds und Korrelationen.',
      route: '/dev-utils',
      apiTitle: 'GET /api/utils/id?type=ulid',
      curl: `curl "http://localhost:3000/api/utils/id?type=ulid"`,
      activeTab: 'info',
    },
    {
      key: 'slugify',
      title: 'Slugify/Transliteration',
      description: 'Wandelt Texte in URL-Slugs um (transliteriert, kleinschreibung, Trennzeichen „-”).',
      route: '/dev-utils',
      apiTitle: 'POST /api/utils/slugify',
      curl: `curl -X POST http://localhost:3000/api/utils/slugify -H "Content-Type: application/json" -d '{"text":"Äpfel & Öl – groß!"}'`,
      activeTab: 'info',
    },
    {
      key: 'hash',
      title: 'Hashing-Service',
      description: 'Erzeugt Hashes (md5/sha256/bcrypt) für Prüfungen, Integrität und Passwort-Workflows.',
      route: '/dev-utils',
      apiTitle: 'POST /api/utils/hash?algo=sha256',
      curl: `curl -X POST "http://localhost:3000/api/utils/hash?algo=sha256" -H "Content-Type: application/json" -d '{"text":"hello"}'`,
      activeTab: 'info',
    },
    {
      key: 'md2html',
      title: 'Markdown → HTML (sanitized)',
      description: 'Sichere Umwandlung von Markdown in HTML für Previews und Editor-Features.',
      route: '/dev-utils',
      apiTitle: 'POST /api/utils/md2html',
      curl: `curl -X POST http://localhost:3000/api/utils/md2html -H "Content-Type: application/json" -d '{"markdown":"# Hello\\n\\n- item"}'`,
      activeTab: 'info',
    },
  
  ];

  async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }
}
