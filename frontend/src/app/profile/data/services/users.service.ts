import { inject, Injectable } from '@angular/core';
import { UserDetailStore } from '../store/user-detail.store';
import { AuthStore } from '@core/store/auth/auth.store';
import { ChangePasswordRequest, UpdateProfileRequest, User } from '../repositories/user.repository';

// Coordinates UserDetailStore with the cross-cutting AuthStore — a store
// can't depend on another store, so logging out after a password change or
// deactivation (both already revoke the refresh token server-side) has to
// happen here.
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly detailStore = inject(UserDetailStore);
  private readonly authStore = inject(AuthStore);

  readonly user = this.detailStore.user;
  readonly profileLoading = this.detailStore.profileLoading;
  readonly profileError = this.detailStore.profileError;
  readonly saving = this.detailStore.loading;
  readonly saveError = this.detailStore.error;

  async updateProfile(request: UpdateProfileRequest): Promise<User> {
    return this.detailStore.updateProfile(request);
  }

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await this.detailStore.changePassword(request);
    this.authStore.logout();
  }

  async deactivate(): Promise<void> {
    await this.detailStore.deactivate();
    this.authStore.logout();
  }
}
