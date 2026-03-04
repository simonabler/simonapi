import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookOpenIcon, ExternalLinkIcon, LucideAngularModule, MailIcon, SendIcon } from 'lucide-angular';

type CatalogCard = {
  key: string;
  title: string;
  sub: string;
  icon: string;
  iconClass?: string;
  badge?: string;
  routes: Array<{ method: 'GET' | 'POST'; path: string; tag: string }>;
  ctaPrimary:    { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
};

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
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  readonly BookOpenIcon     = BookOpenIcon;
  readonly SendIcon         = SendIcon;
  readonly MailIcon         = MailIcon;
  readonly ExternalLinkIcon = ExternalLinkIcon;

  profile = {
    name: 'Simon Abler',
    role: 'Cyber Security Engineer & API Architect',
    location: 'Tyrol, Austria',
    bio: 'Cyber Security Engineer from Tyrol focused on reverse engineering (hardware & software), 24/7 industrial high-availability systems and secure API platforms. I analyse firmware, reverse-engineer hardware protocols and design redundant architectures for industrial environments — and build the tooling myself.',
    links: [
      { label: 'Website',  href: 'https://hub.abler.tirol' },
      { label: 'GitHub',   href: 'https://github.com/simonabler' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/simon-abler-b88a60157' },
    ],
    gravatarHash: 'fd97500da3d31da41dbfc114c04d2e455c32401de85c35ed6ceca18a09cc1957',
    skills: [
      { label: '🔐 Reverse Engineering',
        tags: ['Firmware Analysis', 'Protocol RE', 'Binary Analysis', 'HW Debugging'] },
      { label: '⚙️ Industrial HA',
        tags: ['PLC/SCADA', 'Redundancy Design', '24/7 Operations', 'Failover'] },
      { label: '💻 Full-Stack',
        tags: ['NestJS', 'Angular', 'Linux', 'PostgreSQL', 'Docker', '.NET'] },
    ],
  };

  get gravatarUrl(): string {
    const h = this.profile.gravatarHash?.trim();
    return h
      ? `https://www.gravatar.com/avatar/${h}?s=192&d=identicon`
      : `https://www.gravatar.com/avatar/?s=192&d=identicon`;
  }

  get avatarInitials(): string {
    return this.profile.name
      .split(/\s+/).slice(0, 2)
      .map(p => p[0]?.toUpperCase() ?? '')
      .join('') || 'SA';
  }

  catalog: CatalogCard[] = [
    {
      key: 'qr', title: 'QR Codes', sub: 'URL, text, vCard, Wi-Fi, SMS …', icon: '🔳',
      routes: [{ method: 'POST', path: '/api/qr', tag: 'stable' }],
      ctaPrimary: { label: 'Open Generator', href: '/qr' },
    },
    {
      key: 'barcode', title: 'Barcodes', sub: 'Code128, EAN, ITF-14, PDF417 …', icon: '🏷️',
      routes: [
        { method: 'GET', path: '/api/barcode/png', tag: 'stable' },
        { method: 'GET', path: '/api/barcode/svg', tag: 'stable' },
      ],
      ctaPrimary: { label: 'Open Generator', href: '/barcode' },
    },
    {
      key: 'gs1', title: 'GS1 API', sub: 'GS1-128 · DataMatrix · Batch · Digital Link',
      icon: '📦', iconClass: 'pro', badge: 'Pro',
      routes: [
        { method: 'POST', path: '/api/barcode/gs1/render',              tag: 'stable' },
        { method: 'POST', path: '/api/barcode/gs1/batch',               tag: 'stable' },
        { method: 'POST', path: '/api/barcode/gs1/digital-link/encode', tag: 'new'    },
      ],
      ctaPrimary:   { label: 'GS1 Page',    href: '/barcode/gs1' },
      ctaSecondary: { label: 'Request Key', href: 'mailto:simon@abler.tirol?subject=GS1 Pro API Key' },
    },
    {
      key: 'watermark', title: 'Watermark', sub: 'Logo/text on images, live preview', icon: '🖼️',
      routes: [{ method: 'POST', path: '/api/watermark/apply', tag: 'stable' }],
      ctaPrimary: { label: 'Try it', href: '/tools/watermark' },
    },
    {
      key: 'utils', title: 'Utilities', sub: 'Echo, IDs, slugify, hash, markdown', icon: '🧰',
      routes: [
        { method: 'GET',  path: '/api/utils/echo',    tag: 'stable' },
        { method: 'GET',  path: '/api/utils/id',      tag: 'stable' },
        { method: 'POST', path: '/api/utils/slugify', tag: 'stable' },
      ],
      ctaPrimary: { label: 'Open Dev-Utils', href: '/dev-utils' },
    },
  ];

  services: ServiceCard[] = [
    {
      key: 'gs1', title: 'GS1 API', icon: '📦',
      description: 'GS1-128 and DataMatrix with full AI validation, batch (up to 100/request) and Digital Link encode/decode.',
      route: '/barcode/gs1', apiTitle: 'POST /api/barcode/gs1/batch',
      curl: `curl -X POST https://hub.abler.tirol/api/barcode/gs1/batch \\\n  -H "Content-Type: application/json" \\\n  -d '{"symbology":"gs1-128","format":"png","barcodes":[{"ref":"p1","items":[{"ai":"01","value":"09506000134376"},{"ai":"17","value":"261231"}]}]}'`,
      activeTab: 'info',
    },
    {
      key: 'qr', title: 'QR Codes', icon: '🔳',
      description: 'Generate QR codes for URL, text, email, phone, SMS, vCard or Wi-Fi. Export as PNG or SVG.',
      route: '/qr', apiTitle: 'POST /api/qr',
      curl: `curl -X POST https://hub.abler.tirol/api/qr \\\n  -H "Content-Type: application/json" \\\n  -d '{"type":"url","payload":{"url":"https://example.com"},"format":"svg"}'`,
      activeTab: 'info',
    },
    {
      key: 'watermark', title: 'Watermark', icon: '🖼️',
      description: 'Apply logo or text watermarks to images. Live preview and direct download.',
      route: '/tools/watermark', apiTitle: 'POST /api/watermark/apply',
      curl: `curl -X POST https://hub.abler.tirol/api/watermark/apply \\\n  -F "mode=text" \\\n  -F "file=@image.jpg" \\\n  -F "text=Confidential" \\\n  -o out.jpg`,
      activeTab: 'info',
    },
  ];

  setTab(key: string, tab: 'info' | 'api') {
    this.services = this.services.map(s => s.key === key ? { ...s, activeTab: tab } : s);
  }

  async copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }
}
