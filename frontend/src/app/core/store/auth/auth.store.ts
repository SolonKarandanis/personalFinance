import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import {
  AuthRepository,
  LoginRequest,
  RegisterRequest,
} from '../../repositories/auth.repository';
import { initialAuthState, AuthState } from './auth.state';
import { setError, setLoaded, setLoading, withCallState } from '../features/call-state.feature';

// Cross-cutting session store — the one exception to the Search/Detail/
// Lookup/UI/aggregate granularity rules (see decisions.md): it's the current
// session, not a domain feature.
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(initialAuthState),
  withCallState(),
  withProps(() => ({
    authRepository: inject(AuthRepository),
  })),
  withComputed(({ accessToken }) => ({
    isAuthenticated: computed(() => accessToken() !== null),
  })),
  withMethods((state) => ({
    setAccessToken(accessToken: string | null) {
      patchState(state, { accessToken });
    },
    setBootstrapped() {
      patchState(state, { bootstrapped: true });
    },
    setLoadingState() {
      patchState(state, setLoading());
    },
    setLoadedState() {
      patchState(state, setLoaded());
    },
    setErrorState(error: string) {
      patchState(state, setError(error));
    },
  })),
  withMethods((state) => {
    const { authRepository } = state;
    return {
      login: rxMethod<LoginRequest>(
        pipe(
          tap(() => state.setLoadingState()),
          switchMap((request) =>
            authRepository.login(request).pipe(
              tapResponse({
                next: ({ accessToken }) => {
                  state.setAccessToken(accessToken);
                  state.setLoadedState();
                },
                error: (error: unknown) => state.setErrorState(errorMessage(error)),
              }),
            ),
          ),
        ),
      ),
      register: rxMethod<RegisterRequest>(
        pipe(
          tap(() => state.setLoadingState()),
          switchMap((request) =>
            authRepository.register(request).pipe(
              tapResponse({
                next: ({ accessToken }) => {
                  state.setAccessToken(accessToken);
                  state.setLoadedState();
                },
                error: (error: unknown) => state.setErrorState(errorMessage(error)),
              }),
            ),
          ),
        ),
      ),
      logout: rxMethod<void>(
        pipe(
          switchMap(() =>
            authRepository.logout().pipe(
              tapResponse({
                next: () => state.setAccessToken(null),
                // Clear locally regardless — an already-invalid session
                // shouldn't leave the user stuck unable to log out.
                error: () => state.setAccessToken(null),
              }),
            ),
          ),
        ),
      ),
      // Not an rxMethod: the app initializer needs an actual Promise it can
      // await before bootstrapping the router, not a fire-and-forget dispatch.
      async tryRestoreSession(): Promise<void> {
        try {
          const { accessToken } = await firstValueFrom(authRepository.refresh());
          state.setAccessToken(accessToken);
        } catch {
          state.setAccessToken(null);
        } finally {
          state.setBootstrapped();
        }
      },
    };
  }),
);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}
