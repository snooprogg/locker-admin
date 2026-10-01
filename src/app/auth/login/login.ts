import { Component, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Theme = 'dark' | 'light';
const THEME_KEY = 'spoke-theme';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  host: { class: 'block h-full' },
})
export class LoginComponent {
  private document = inject(DOCUMENT);

  email = '';
  password = '';
  showPassword = false;
  loading = false;

  /** 6 × 4 locker grid — true = available (green), false = occupied */
  lockers = '111010101101011010101101'.split('').map((c) => c === '1');

  theme = signal<Theme>(this.readSavedTheme());

  constructor() {
    // Keeps <html data-theme="..."> in sync so the whole app switches with it
    effect(() => {
      const t = this.theme();
      const html = this.document.documentElement;
      if (t === 'light') html.setAttribute('data-theme', 'light');
      else html.removeAttribute('data-theme');
      try { localStorage.setItem(THEME_KEY, t); } catch {}
    });
  }

  toggleTheme() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  onSubmit() {
    // TODO: call your auth service
  }

  onForgotPassword() {}

  onSso() {}

  private readSavedTheme(): Theme {
    try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  }
}