import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookOpenIcon, LucideAngularModule, SendIcon } from 'lucide-angular';

type ServiceCard = {
  key: string;
  title: string;
  description: string;
  route?: string;
  apiTitle: string;
  curl: string;
  activeTab: 'info' | 'api';
  icon?: string;
};

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './home.component.html',
  styles: [`
  .hero { background: linear-gradient(135deg, var(--brand-2), var(--brand)); }
  .service-card .nav-link { cursor: pointer; }
  .service-card .nav-pills .nav-link.active { background: linear-gradient(135deg, var(--brand-2), var(--brand)); }
  .code { background: #0f172a; color: #e2e8f0; border-radius: .5rem; padding: .75rem; overflow: auto; }
  .code code { white-space: pre-wrap; word-break: break-word; }
  .profile .avatar { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #22d3ee, #818cf8); color: #0b1020; }
  .profile { backdrop-filter: saturate(1.2); }
  .service-card .icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; background: color-mix(in oklab, var(--brand), white 85%); }
  .service-desc { color: var(--bs-body-color); }
  .service-card .card-body { color: var(--bs-body-color); }
  `],
})
export class HomeComponent {

  readonly BookOpenIcon = BookOpenIcon;
  readonly SendIcon = SendIcon;



  profile = {
    name: 'Simon Abler',
    role: 'Senior Full‑Stack Engineer (Cybersecurity / CISO mindset)',
    location: 'Tyrol, AT',
    bio: 'Senior full‑stack engineer with a security‑first, CISO. I design and operate secure API platforms, developer tools and web UIs end‑to‑end. Focus on cybersecurity (OWASP, threat modeling, IAM), API governance, automation and measurable DX. Strong with NestJS, Angular, TypeORM, PostgreSQL and containers — shipping clean architecture from home‑lab to cloud.',
    links: [
      { label: 'Website', href: 'https://hub.abler.tirol' },
      { label: 'GitHub', href: 'https://github.com/simonabler' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/simonabler' },
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
      title: 'QR Codes',
      description: 'Erzeuge QR aus URL, Text, E‑Mail, Telefon, SMS, vCard oder WLAN. Export als PNG/SVG.',
      route: '/qr',
      apiTitle: 'POST /api/qr',
      curl: `curl -X POST http://localhost:3000/api/qr -H "Content-Type: application/json" -d '{"type":"url","payload":{"url":"https://example.com"},"format":"svg"}'`,
      activeTab: 'info',
      icon: '🔳',
    },
    {
      key: 'barcode',
      title: 'Barcodes & GS1',
      description: 'Standardbarcodes (PNG/SVG) und GS1-128/DataMatrix (Render per JSON).',
      route: '/barcode',
      apiTitle: 'GET /api/barcode/png | svg, POST /api/barcode/gs1/render',
      curl: `curl -X POST http://localhost:3000/api/barcode/gs1/render -H "Content-Type: application/json" -d '{"symbology":"gs1-128","format":"png","items":[{"ai":"01","value":"09506000134352"}]}'`,
      activeTab: 'info',
      icon: '🏷️',
    },
    {
      key: 'watermark',
      title: 'Watermark',
      description: 'Bilder mit Logo/Text versehen. Live‑Preview und Download.',
      route: '/tools/watermark',
      apiTitle: 'POST /api/watermark/apply',
      curl: `curl -X POST http://localhost:3000/api/watermark/apply -F "mode=text" -F "file=@image.jpg" -F "text=Demo" -o out.jpg`,
      activeTab: 'info',
      icon: '🖼️',
    },
    {
      key: 'locks',
      title: 'Locks',
      description: 'Access‑Links verwalten (Admin) und per Swipe‑to‑Open öffnen.',
      route: '/admin/lock',
      apiTitle: 'GET /api/lock/locks, POST /api/lock/open',
      curl: `curl "http://localhost:3000/api/lock/locks?slug=...&t=..."`,
      activeTab: 'info',
      icon: '🔒',
    },
    {
      key: 'utils',
      title: 'Utilities',
      description: 'Echo, IDs, Slugify, Hashing, Markdown → HTML für den Alltag.',
      route: '/dev-utils',
      apiTitle: 'GET /api/utils/echo | id, POST /api/utils/slugify | hash | md2html',
      curl: `curl http://localhost:3000/api/utils/echo`,
      activeTab: 'info',
      icon: '🧰',
    },
  ];

  setTab(key: string, tab: 'info' | 'api') {
    this.services = this.services.map(s => s.key === key ? { ...s, activeTab: tab } : s);
  }

  async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ;
    }
  }
}
