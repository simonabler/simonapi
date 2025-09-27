import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { CookieConsentService } from './cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss',
})
export class CookieBannerComponent {

  private readonly cookieConsent = inject(CookieConsentService);

  readonly visible = signal(!this.cookieConsent.hasAnswered());
  readonly showDetails = signal(false);


  toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  acceptEssential(): void {
    this.cookieConsent.setConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
    this.visible.set(false);
  }

  acceptAll(): void {
    this.cookieConsent.setConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
    this.visible.set(false);
  }

  reset(): void {
    this.cookieConsent.clear();
    this.visible.set(true);
    this.showDetails.set(true);
  }
}
