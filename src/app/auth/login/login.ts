import { Component, inject, ChangeDetectorRef  } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { LucideSunDim, LucideMoon } from '@lucide/angular';
import { SettingsService } from '../../services/settings';
import { SupabaseService } from '../../services/supabase.service';
import { FunctionsService } from '../../services/functions.service';

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
  private supabase = inject(SupabaseService);
  private fs= inject(FunctionsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
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

  async onSubmit() {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading = true;
    this.form.disable();
    // TODO: call your auth service with { email, password }
          try {
        // Sign in with Supabase
        const { data, error } = await this.supabase.signIn(email, password);

        if (error) {
          throw error;
        }

        if (data.session) {
          // Save session token
          this.fs.saveSupabaseSession(data.session);
          console.log('Login successful, session:', data.session);
          this.router.navigate(['home']);
        }
      } catch (error: any) {
        console.error('Login error:', error);
      } finally {
        // Reset loading state
        this.loading = false;
        //this.form.reset();
        this.form.enable();
        this.cdr.detectChanges();
      }
    console.log('Login submit', { email, password });
  }

  onForgotPassword() {}

  onSso() {}
}
