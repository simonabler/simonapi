import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LucideAngularModule, PlusIcon } from 'lucide-angular';
import { QrEditorItemComponent } from './qr-editor-item.component';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environments';

type Item = { id: number };

@Component({
  standalone: true,
  imports: [CommonModule, LucideAngularModule, QrEditorItemComponent],
  selector: 'app-qr-editor',
  templateUrl: './qr-editor.component.html',
  styleUrls: ['./qr-editor.component.scss']
})
export class QrEditorComponent implements OnInit {
  readonly PlusIcon = PlusIcon;

  items: Item[] = [{ id: Date.now() }];
  
  private title = inject(Title);
  private meta = inject(Meta);
  
  private platformId = inject(PLATFORM_ID);
  isBrowser = false;

  constructor()
  {
        this.isBrowser = isPlatformBrowser(this.platformId);
  }

  add() {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this.items = [...this.items, { id }];
  }

  remove(id: number) {
    this.items = this.items.filter(x => x.id !== id);
    if (this.items.length === 0) this.add();
  }

  trackById(_i: number, it: Item) { return it.id; }

  ngOnInit(): void {

    let origin: string | any  = environment.API_BASE_URL;
    if(this.isBrowser){
      origin = window?.location?.origin || "";
    }

    const pageTitle = 'QR Code Generator — Free PNG/SVG';
    const desc = 'Create free QR codes online: URL, text, email, phone, SMS, vCard, Wi-Fi and more. Export as PNG or SVG. No login required.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: `${origin}/qr` });

    // Set canonical
    const link: HTMLLinkElement = document.querySelector("link[rel='canonical']") || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', `${origin}/qr`);
    if (!link.parentNode) document.head.appendChild(link);

    // JSON-LD structured data for WebApplication
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'QR Code Generator',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      url: `${origin}/qr`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', category: 'Free' },
      description: desc,
      creator: { '@type': 'Person', name: 'Simon Abler' }
    } as const;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }
}
