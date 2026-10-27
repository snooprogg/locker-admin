import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { FunctionsService } from '../services/functions.service';

/**
 * Protects routes inside the app shell. Asks supabase-js for the current session
 * (it refreshes an expired access token automatically), mirrors it into the cookie
 * that `ApiCallsService` reads, and bounces to /login when there is none.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const supabase = inject(SupabaseService);
  const fs = inject(FunctionsService);
  const router = inject(Router);

  const session = await supabase.getSession();
  if (session) {
    fs.saveSupabaseSession(session);
    return true;
  }

  fs.clearSupabaseSession();
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps already signed-in users off the login page. */
export const guestGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  return (await supabase.getSession()) ? router.createUrlTree(['/home']) : true;
};
