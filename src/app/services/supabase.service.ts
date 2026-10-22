// src/app/services/supabase.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthError, AuthTokenResponsePassword, User, Session } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.publishableKey
    );
  }

  // Get the Supabase client instance
  get client(): SupabaseClient {
    return this.supabase;
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthTokenResponsePassword> {
    return await this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  // Sign in with Google OAuth
  async signInWithGoogle(redirectUrl?: string) {
    return await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl || window.location.origin + '/auth/callback'
      }
    });
  }


  // Sign out
  async signOut() {
    return await this.supabase.auth.signOut();
  }

  // Get current session
  async getSession(): Promise<Session | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return data.session;
  }

  // Get current user
  async getUser(): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data.user;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  // Reset password
  async resetPassword(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email);
  }

  // Update password
  async updatePassword(newPassword: string) {
    return await this.supabase.auth.updateUser({
      password: newPassword
    });
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }


}
