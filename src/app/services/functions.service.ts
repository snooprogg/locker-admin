// src/app/services/functions.services.ts
import { Injectable, signal } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '../models/site';
import { Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class FunctionsService {
  private tokenKey = 'jwtToken'; // Key for storing the JWT in cookies
  private sessionKey = 'supabase_session'; // Key for storing Supabase session

  constructor(private cookieService: CookieService) {}

  private readonly _loading = signal(false);

  readonly loading = this._loading.asReadonly();
  show() {
    this._loading.set(true);
  }

  hide() {
    this._loading.set(false);
  }

  // Save JWT token in a cookie
  saveToken(token: string, expiresInDays = 7): void {
    this.cookieService.set(this.tokenKey, token, { expires: expiresInDays, path: '/', secure: false, sameSite: 'Strict' });
  }

  // Retrieve JWT token from the cookie
  getToken(): string | null {
    return this.cookieService.get(this.tokenKey) || null;
  }

  // Decode JWT token to retrieve user details
  decodeToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      return jwtDecode<JwtPayload>(token); // Decodes and returns the JWT payload as a User
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  // Check if the token is valid (based on expiration)
  isTokenValid(): boolean {
    const payload = this.decodeToken();
    if (!payload || !payload.exp) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    return payload.exp > currentTime;
  }

  // Clear JWT token from the cookie (for logout)
  clearToken(): void {
    this.cookieService.delete(this.tokenKey, '/');
  }

  // Save Supabase session
  saveSupabaseSession(session: Session): void {
    this.cookieService.set(
      this.sessionKey,
      JSON.stringify(session),
      { expires: 7, path: '/', secure: false, sameSite: 'Strict' }
    );
  }

  // Get Supabase session
  getSupabaseSession(): Session | null {
    const sessionStr = this.cookieService.get(this.sessionKey);
    if (!sessionStr) {
      return null;
    }
    try {
      return JSON.parse(sessionStr) as Session;
    } catch (error) {
      console.error('Error parsing Supabase session:', error);
      return null;
    }
  }

  // Check if Supabase session is valid
  isSupabaseSessionValid(): boolean {
    const session = this.getSupabaseSession();
    if (!session || !session.expires_at) {
      return false;
    }
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    return Date.now() < expiresAt;
  }

  // Clear Supabase session
  clearSupabaseSession(): void {
    this.cookieService.delete(this.sessionKey, '/');
  }

  // Get access token from Supabase session
  getSupabaseAccessToken(): string | null {
    const session = this.getSupabaseSession();
    return session?.access_token || null;
  }

  getAge(birthdate: string): number {
    const [month, day, year] = birthdate.split('/').map(Number);
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

}
