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
  imports: [CommonModule, LucideAngularModule],
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
  `],
})
export class HomeComponent {

  readonly BookOpenIcon = BookOpenIcon;
  readonly SendIcon = SendIcon;



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
      icon: '🔳',
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
      icon: '🔁',
    },
    {
      key: 'id',
      title: 'UUID/ULID-Generator',
      description: 'Generiert IDs (ULID oder UUID) für Tests, Seeds und Korrelationen.',
      route: '/dev-utils',
      apiTitle: 'GET /api/utils/id?type=ulid',
      curl: `curl "http://localhost:3000/api/utils/id?type=ulid"`,
      activeTab: 'info',
      icon: '🆔',
    },
    {
      key: 'slugify',
      title: 'Slugify/Transliteration',
      description: 'Wandelt Texte in URL-Slugs um (transliteriert, kleinschreibung, Trennzeichen „-”).',
      route: '/dev-utils',
      apiTitle: 'POST /api/utils/slugify',
      curl: `curl -X POST http://localhost:3000/api/utils/slugify -H "Content-Type: application/json" -d '{"text":"Äpfel & Öl – groß!"}'`,
      activeTab: 'info',
      icon: '📝',
    },
    {
      key: 'hash',
      title: 'Hashing-Service',
      description: 'Erzeugt Hashes (md5/sha256/bcrypt) für Prüfungen, Integrität und Passwort-Workflows.',
      route: '/dev-utils',
      apiTitle: 'POST /api/utils/hash?algo=sha256',
      curl: `curl -X POST "http://localhost:3000/api/utils/hash?algo=sha256" -H "Content-Type: application/json" -d '{"text":"hello"}'`,
      activeTab: 'info',
      icon: '🔐',
    },
    {
      key: 'md2html',
      title: 'Markdown → HTML (sanitized)',
      description: 'Sichere Umwandlung von Markdown in HTML für Previews und Editor-Features.',
      route: '/dev-utils',
      apiTitle: 'POST /api/utils/md2html',
      curl: `curl -X POST http://localhost:3000/api/utils/md2html -H "Content-Type: application/json" -d '{"markdown":"# Hello\\n\\n- item"}'`,
      activeTab: 'info',
      icon: '📄',
    },

  ];

  async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }
}
