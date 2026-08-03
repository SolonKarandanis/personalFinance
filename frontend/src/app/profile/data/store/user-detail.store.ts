import { computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { ChangePasswordRequest, UpdateProfileRequest, User, UserRepository } from '../repositories/user.repository';
import { setError, setLoaded, setLoading, withCallState } from '@core/store/features/call-state.feature';

// No .state.ts and no selectedDomainId — unlike every other Detail store,
// there's only ever one profile (the caller's own), so this store owns both
// the read (getProfile()'s resource) and write side, and can reload its own
// resource directly after a mutation. That doesn't violate "a store never
// depends on another store" — that rule is about depending on OTHER stores,
// not a store managing its own resource's lifecycle.
export const UserDetailStore = signalStore(
  { providedIn: 'root' },
  withCallState(),
  withProps(() => {
    const userRepository = inject(UserRepository);
    const userResource = userRepository.getProfile();
    return { userRepository, userResource };
  }),
  // Named profileLoading/profileError (not loading/error) — withCallState()
  // above already claims those names for the write side, and this store,
  // uniquely, owns both read and write, so resourceCallState()'s usual
  // names would collide here.
  withComputed(({ userResource }) => ({
    user: computed(() => userResource.value() ?? null),
    profileLoading: computed(() => userResource.isLoading()),
    profileError: computed(() => userResource.error()?.message ?? null),
  })),
  withMethods((state) => ({
    setLoadingState(): void {
      patchState(state, setLoading());
    },
    setLoadedState(): void {
      patchState(state, setLoaded());
    },
    setErrorState(error: string): void {
      patchState(state, setError(error));
    },
  })),
  withMethods((state) => {
    const { userRepository, userResource } = state;
    return {
      async updateProfile(request: UpdateProfileRequest): Promise<User> {
        const domainId = requireDomainId(state.user());
        state.setLoadingState();
        try {
          const user = await firstValueFrom(userRepository.updateProfile(domainId, request));
          state.setLoadedState();
          userResource.reload();
          return user;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async changePassword(request: ChangePasswordRequest): Promise<void> {
        const domainId = requireDomainId(state.user());
        state.setLoadingState();
        try {
          await firstValueFrom(userRepository.changePassword(domainId, request));
          state.setLoadedState();
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async deactivate(): Promise<User> {
        const domainId = requireDomainId(state.user());
        state.setLoadingState();
        try {
          const user = await firstValueFrom(userRepository.deactivateAccount(domainId));
          state.setLoadedState();
          userResource.reload();
          return user;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
    };
  }),
);

function requireDomainId(user: User | null): string {
  if (!user) {
    throw new Error('Profile mutation called before the profile finished loading');
  }
  return user.domainId;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}
