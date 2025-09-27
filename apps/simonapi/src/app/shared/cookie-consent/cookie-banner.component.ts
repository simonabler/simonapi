import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CookieConsentService } from './cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss',
})
export class CookieBannerComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cookieConsent = inject(CookieConsentService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly visible = signal(false);
  readonly showDetails = signal(false);

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }
    this.visible.set(!this.cookieConsent.hasAnswered());
  }

  toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  acceptEssential(): void {
    if (!this.isBrowser) {
      return;
    }
    this.cookieConsent.setConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
    this.visible.set(false);
  }

  acceptAll(): void {
    if (!this.isBrowser) {
      return;
    }
    this.cookieConsent.setConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
    this.visible.set(false);
  }

  reset(): void {
    if (!this.isBrowser) {
      return;
    }
    this.cookieConsent.clear();
    this.visible.set(true);
    this.showDetails.set(true);
  }
}
