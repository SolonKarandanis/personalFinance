import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRepository } from '@core/repositories/base-repository';
import { ApiEndpoints } from '@core/repositories/api-endpoints';

export type UserStatus = 'active' | 'deactivated';

export interface User {
  domainId: string;
  email: string;
  firstName: string;
  lastName: string;
  currency: string;
  status: UserStatus;
  createdAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// GET uses httpResource — authInterceptor attaches the Authorization header
// and withCredentials to every outgoing request, including this one.
@Injectable({ providedIn: 'root' })
export class UserRepository extends BaseRepository {
  getProfile(): HttpResourceRef<User | undefined> {
    return httpResource<User>(() => ({ url: `${ApiEndpoints.USERS}/account` }));
  }

  updateProfile(domainId: string, request: UpdateProfileRequest): Observable<User> {
    return this.http.patch<User>(`${ApiEndpoints.USERS}/${domainId}`, request);
  }

  changePassword(domainId: string, request: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${ApiEndpoints.USERS}/${domainId}/password`, request);
  }

  deactivateAccount(domainId: string): Observable<User> {
    return this.http.patch<User>(`${ApiEndpoints.USERS}/${domainId}/deactivate`, {});
  }
}
