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
  ctaPrimary:    { label: string; href: string; external?: boolean };
  ctaSecondary?: { label: string; href: string; external?: boolean };
  // Unified quick-start: optional curl snippet shown in "Try" tab
  description?: string;
  curl?: string;
  curlTitle?: string;
  activeTab?: 'info' | 'try';
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
      description: 'Generate QR codes for URL, plain text, e-mail, phone, SMS, vCard or Wi-Fi credentials. Supports PNG and SVG output with adjustable error-correction.',
      curlTitle: 'POST /api/qr',
      curl: `curl -X POST https://hub.abler.tirol/api/qr \\\n  -H "Content-Type: application/json" \\\n  -d '{"type":"url","payload":{"url":"https://example.com"},"format":"svg"}'`,
      activeTab: 'info',
    },
    {
      key: 'barcode', title: 'Barcodes', sub: 'Code128, EAN, ITF-14, PDF417 …', icon: '🏷️',
      routes: [
        { method: 'GET', path: '/api/barcode/png', tag: 'stable' },
        { method: 'GET', path: '/api/barcode/svg', tag: 'stable' },
      ],
      ctaPrimary: { label: 'Open Generator', href: '/barcode' },
      description: 'Standard 1D barcodes: Code128, EAN-13, EAN-8, UPC-A, ITF-14, PDF417 and more. Render as PNG or SVG via query parameters.',
      curlTitle: 'GET /api/barcode/png',
      curl: `curl "https://hub.abler.tirol/api/barcode/png?symbology=code128&value=ABC-1234" \\\n  --output barcode.png`,
      activeTab: 'info',
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
      ctaSecondary: { label: 'Request Key', href: 'mailto:simon@abler.tirol?subject=GS1 Pro API Key', external: true },
      description: 'GS1-128 and DataMatrix with full AI validation, check digits and inter-AI combination rules. Batch up to 100 barcodes per request. Digital Link encode/decode included.',
      curlTitle: 'POST /api/barcode/gs1/batch',
      curl: `curl -X POST https://hub.abler.tirol/api/barcode/gs1/batch \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: sk_pro_…" \\\n  -d '{"symbology":"gs1-128","format":"png","barcodes":[{"ref":"p1","items":[{"ai":"01","value":"09506000134376"},{"ai":"17","value":"261231"}]}]}'`,
      activeTab: 'info',
    },
    {
      key: 'crypto', title: 'Crypto', sub: 'TOTP · HMAC · JWT · Ed25519', icon: '🔐',
      routes: [
        { method: 'POST', path: '/api/crypto/totp/generate', tag: 'stable' },
        { method: 'POST', path: '/api/crypto/hmac',          tag: 'stable' },
        { method: 'POST', path: '/api/crypto/jwt/sign',      tag: 'stable' },
      ],
      ctaPrimary: { label: 'Open Crypto', href: '/crypto' },
      description: 'TOTP token generation and verification (RFC 6238), HMAC-SHA signing, JWT sign/verify with configurable algorithm, and Ed25519 keypair generation.',
      curlTitle: 'POST /api/crypto/totp/generate',
      curl: `curl -X POST https://hub.abler.tirol/api/crypto/totp/generate \\\n  -H "Content-Type: application/json" \\\n  -d '{"secret":"JBSWY3DPEHPK3PXP"}'`,
      activeTab: 'info',
    },
    {
      key: 'watermark', title: 'Watermark', sub: 'Logo/text on images, live preview', icon: '🖼️',
      routes: [{ method: 'POST', path: '/api/watermark/apply', tag: 'stable' }],
      ctaPrimary: { label: 'Try it', href: '/tools/watermark' },
      description: 'Apply text or image watermarks to uploaded photos. Configure position, opacity and font. Live preview in the browser, direct download as JPEG.',
      curlTitle: 'POST /api/watermark/apply',
      curl: `curl -X POST https://hub.abler.tirol/api/watermark/apply \\\n  -F "mode=text" \\\n  -F "file=@image.jpg" \\\n  -F "text=Confidential" \\\n  -o out.jpg`,
      activeTab: 'info',
    },
    {
      key: 'signpack', title: 'Signpack', sub: 'Token-protected file hand-off & signing', icon: '📋',
      routes: [
        { method: 'POST', path: '/api/signpacks',              tag: 'new' },
        { method: 'POST', path: '/api/signpacks/:id/sign',     tag: 'new' },
        { method: 'GET',  path: '/api/signpacks/:id/bundle.zip', tag: 'new' },
      ],
      ctaPrimary: { label: 'Try Signpack', href: '/signpack' },
      description: 'Upload a file, get a unique signing link to share with a recipient. The recipient downloads the original, uploads the signed version. Sender downloads both as a bundle.',
      curlTitle: 'POST /api/signpacks',
      curl: `curl -X POST https://hub.abler.tirol/api/signpacks \\\n  -F "file=@document.pdf" \\\n  -F "expiresInMinutes=1440"`,
      activeTab: 'info',
    },
    {
      key: 'utils', title: 'Dev Utilities', sub: 'Echo, IDs, slugify, hash, markdown', icon: '🧰',
      routes: [
        { method: 'GET',  path: '/api/utils/id',      tag: 'stable' },
        { method: 'POST', path: '/api/utils/slugify', tag: 'stable' },
        { method: 'POST', path: '/api/utils/hash',    tag: 'stable' },
      ],
      ctaPrimary: { label: 'Open Dev-Utils', href: '/dev-utils' },
      description: 'Handy developer endpoints: UUID/ULID/NanoID generation, text slugify, SHA-256/SHA-512 hashing, markdown-to-HTML rendering, and a debug echo endpoint.',
      curlTitle: 'GET /api/utils/id',
      curl: `curl "https://hub.abler.tirol/api/utils/id?type=uuid"`,
      activeTab: 'info',
    },
  ];

  setTab(key: string, tab: 'info' | 'try') {
    this.catalog = this.catalog.map(c => c.key === key ? { ...c, activeTab: tab } : c);
  }

  async copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }
}
