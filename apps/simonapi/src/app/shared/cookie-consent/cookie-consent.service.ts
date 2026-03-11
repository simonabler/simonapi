import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type CookieConsentPreferences = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  givenAt: string;
};

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly cookieName = 'simonapi-consent';
  private cache: CookieConsentPreferences | null | undefined;

  private readonly platformId = inject(PLATFORM_ID);

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readCookieValue(): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    const prefix = `${this.cookieName}=`;
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    const match = cookies.find((entry) => entry.startsWith(prefix));
    if (!match) {
      return null;
    }
    return match.substring(prefix.length);
  }

  getConsent(): CookieConsentPreferences | null {
    if (!this.isBrowser()) {
      return this.cache ?? null;
    }

    if (this.cache !== undefined) {
      return this.cache;
    }

    const raw = this.readCookieValue();
    if (!raw) {
      this.cache = null;
      return null;
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CookieConsentPreferences>;
      if (typeof parsed.essential !== 'boolean') {
        throw new Error('Invalid consent payload');
      }
      const consent: CookieConsentPreferences = {
        essential: parsed.essential,
        analytics: !!parsed.analytics,
        marketing: !!parsed.marketing,
        givenAt: parsed.givenAt ?? new Date().toISOString(),
      };
      this.cache = consent;
      return consent;
    } catch (error) {
      this.clear();
      this.cache = null;
      return null;
    }
  }

  setConsent(partial: Omit<CookieConsentPreferences, 'givenAt'> & { givenAt?: string }): CookieConsentPreferences {
    const consent: CookieConsentPreferences = {
      essential: partial.essential,
      analytics: !!partial.analytics,
      marketing: !!partial.marketing,
      givenAt: partial.givenAt ?? new Date().toISOString(),
    };

    if (this.isBrowser()) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 180);
      const encoded = encodeURIComponent(JSON.stringify(consent));
      document.cookie = `${this.cookieName}=${encoded}; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax`;
      this.cache = consent;
    } else {
      this.cache = consent;
    }

    return consent;
  }

  clear(): void {
    if (this.isBrowser()) {
      document.cookie = `${this.cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
    this.cache = null;
  }

  hasAnswered(): boolean {
    return this.getConsent() !== null;
  }
}
