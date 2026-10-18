import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideSunDim, LucideMoon } from '@lucide/angular';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideSunDim, LucideMoon],
  templateUrl: './login.html',
  host: { class: 'block h-full' },
})
export class LoginComponent {
  private settings = inject(SettingsService);
  private fb = inject(NonNullableFormBuilder);

  theme = this.settings.theme;
  ariaThemeLabel = this.settings.themeLabel;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  showPassword = false;
  loading = false;
  error: string | null = null;

  /** 6 × 4 locker grid — true = available (green), false = occupied */
  lockers = '111010101101011010101101'.split('').map((c) => c === '1');

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  toggleTheme() {
    this.settings.toggleTheme();
  }

  onSubmit() {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading = true;
    this.form.disable();
    // TODO: call your auth service with { email, password }
    console.log('Login submit', { email, password });
    this.loading = false;
    this.form.enable();
  }

  onForgotPassword() {}

  onSso() {}
}
