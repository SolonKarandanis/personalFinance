import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRepository } from './base-repository';
import { ApiEndpoints } from './api-endpoints';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
}

// All mutations (POST) — nothing here is a GET, so nothing uses httpResource.
@Injectable({ providedIn: 'root' })
export class AuthRepository extends BaseRepository {
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${ApiEndpoints.AUTH}/login`, request, {
      withCredentials: true,
    });
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${ApiEndpoints.AUTH}/register`, request, {
      withCredentials: true,
    });
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${ApiEndpoints.AUTH}/refresh`,
      {},
      { withCredentials: true },
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${ApiEndpoints.AUTH}/logout`, {}, { withCredentials: true });
  }
}
