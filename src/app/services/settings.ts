import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';

export type Theme = 'dark' | 'light';
const THEME_KEY = 'spoke-theme';
const THEME_COOKIE_DAYS = 365;

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private document = inject(DOCUMENT);
  private cookies = inject(CookieService);

  readonly theme = signal<Theme>(this.readSavedTheme());
  readonly themeLabel = computed(() =>
    this.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );

  constructor() {
    // Keeps <html data-theme="..."> in sync so the whole app switches with it
    effect(() => {
      const t = this.theme();
      this.document.documentElement.setAttribute('data-theme', t);
      this.cookies.set(THEME_KEY, t, { expires: THEME_COOKIE_DAYS, path: '/', sameSite: 'Lax' });
    });
  }

  toggleTheme() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  /** Saved choice wins; first-time visitors follow the OS preference. */
  private readSavedTheme(): Theme {
    const saved = this.cookies.get(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return this.document.defaultView?.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
}
