// src/app/services/apicalls.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { FunctionsService } from './functions.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiCallOptions {
  /** Postgres schema for PostgREST calls (sets Accept-Profile / Content-Profile). Defaults to `public`. */
  schema?: string;
  /** Extra headers, e.g. `{ Prefer: 'return=representation' }`. */
  headers?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class ApiCallsService {
  private apiUrl = environment.supabase.url.replace(/\/+$/, '') + '/';
  private apiKey = environment.supabase.publishableKey;

  constructor(private http: HttpClient, private fs: FunctionsService) {}

  // Universal API Call Method (targets Supabase: rest/v1/*, storage/v1/*, auth/v1/*, functions/v1/*)
  apiCall(
    endpoint: string,
    method: HttpMethod,
    body: any = null,
    jwtRequired: boolean = false,
    opts: ApiCallOptions = {}
  ): Observable<any> {
    let headers = new HttpHeaders({ apikey: this.apiKey, ...opts.headers });

    // Content-Type: JSON by default, the file's own type for File/Blob, and let the browser set it for FormData
    if (body instanceof Blob) {
      headers = headers.set('Content-Type', body.type || 'application/octet-stream');
    } else if (body !== null && !(body instanceof FormData)) {
      headers = headers.set('Content-Type', 'application/json');
    }

    // PostgREST needs the schema in a profile header when it isn't `public`
    if (opts.schema) {
      headers = headers.set(method === 'GET' ? 'Accept-Profile' : 'Content-Profile', opts.schema);
    }

    // If JWT is required, add Authorization header (falls back to the publishable key = anon)
    const token = jwtRequired ? this.fs.getSupabaseAccessToken() : null;
    headers = headers.set('Authorization', `Bearer ${token ?? this.apiKey}`);

    const url = this.apiUrl + endpoint.replace(/^\/+/, '');
    const options = { headers };

    switch (method) {
      case 'GET':
        return this.http.get(url, options);
      case 'POST':
        return this.http.post(url, body, options);
      case 'PUT':
        return this.http.put(url, body, options);
      case 'PATCH':
        return this.http.patch(url, body, options);
      case 'DELETE':
        return this.http.delete(url, options);
      default:
        throw new Error('Invalid HTTP method');
    }
  }

  /** Public URL for an object in a public storage bucket. */
  publicUrl(bucket: string, path: string): string {
    return `${this.apiUrl}storage/v1/object/public/${bucket}/${path}`;
  }

  /** Download an object from a private bucket as an object URL. */
  getImage(bucket: string, path: string): Observable<string> {
    const token = this.fs.getSupabaseAccessToken();
    const headers = new HttpHeaders({ apikey: this.apiKey, Authorization: `Bearer ${token ?? this.apiKey}` });

    return this.http.get(`${this.apiUrl}storage/v1/object/${bucket}/${path}`, { headers, responseType: 'blob' }).pipe(
      map((blob: Blob) => URL.createObjectURL(blob)) // Convert blob to object URL
    );
  }
}
