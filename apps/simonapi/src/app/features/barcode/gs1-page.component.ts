import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeftIcon, LucideAngularModule, MailIcon } from 'lucide-angular';
import { BarcodeGs1EditorItemComponent } from './barcode-gs1-editor-item.component';

type TierFeature = { text: string; included: boolean };
type Tier = {
  key: string;
  name: string;
  price: string;
  period: string;
  features: TierFeature[];
  limit: string;
  cta: { label: string; href: string; variant: 'primary' | 'outline' } | null;
  featured: boolean;
};

@Component({
  standalone: true,
  selector: 'app-gs1-page',
  imports: [RouterLink, LucideAngularModule, BarcodeGs1EditorItemComponent],
  templateUrl: './gs1-page.component.html',
})
export class Gs1PageComponent {
  readonly ArrowLeftIcon = ArrowLeftIcon;
  readonly MailIcon = MailIcon;

  readonly tiers: Tier[] = [
    {
      key: 'free',
      name: 'Free',
      price: '€0',
      period: '/ month',
      features: [
        { text: 'Standard Barcodes (PNG/SVG)', included: true },
        { text: 'QR Codes', included: true },
        { text: 'GS1 AI Registry (Lookup)', included: true },
        { text: 'GS1-128 / DataMatrix', included: false },
        { text: 'Batch generation', included: false },
        { text: 'Digital Link', included: false },
      ],
      limit: '10 req/min · no AI validation',
      cta: null,
      featured: false,
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '€29',
      period: '/ month',
      features: [
        { text: 'Everything in Free', included: true },
        { text: 'GS1-128 & DataMatrix', included: true },
        { text: 'GS1 Digital Link encode/decode', included: true },
        { text: 'Full AI validation', included: true },
        { text: 'Batch generation', included: false },
      ],
      limit: '100 req/min · 10,000 req/day',
      cta: { label: 'Request key', href: 'mailto:simon@abler.tirol?subject=GS1 Pro API Key', variant: 'primary' },
      featured: true,
    },
    {
      key: 'industrial',
      name: 'Industrial',
      price: '€99',
      period: '/ month',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Batch up to 100 Barcodes/Request', included: true },
        { text: 'Base64-PNG + SVG in Batch', included: true },
        { text: 'Priority Support', included: true },
        { text: 'SLA on request', included: true },
      ],
      limit: '1,000 req/min · unlimited/day',
      cta: { label: 'Request key', href: 'mailto:simon@abler.tirol?subject=GS1 Industrial API Key', variant: 'outline' },
      featured: false,
    },
  ];
}
