import { Component, inject } from '@angular/core';
import { Header } from '../navigation/header/header';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from '../navigation/sidebar/sidebar';
import { SupabaseService } from '../../services/supabase.service';
import { FunctionsService } from '../../services/functions.service';

@Component({
  imports: [RouterOutlet, Sidebar, Header],
  selector: 'app-wrapper',
  styleUrl: './wrapper.css',
  templateUrl: './wrapper.html',
  host: { class: 'block h-full' },
})
export class Wrapper {
  private supabase = inject(SupabaseService);
  private fs = inject(FunctionsService);
  private router = inject(Router);

  async onSignOut() {
    try {
      await this.supabase.signOut();
    } catch (err) {
      console.error('Supabase sign out failed:', err);
    } finally {
      // Always drop the local session so the app treats the user as logged out, even if the network call failed
      this.fs.clearSupabaseSession();
      this.fs.clearToken();
      this.router.navigate(['/login']);
    }
  }
}
