import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../store/auth/auth.store';

// Safe to read isAuthenticated() synchronously here: the app initializer
// (see app.config.ts) awaits tryRestoreSession() before the router starts
// evaluating any guards, so bootstrap has already completed by this point.
export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authStore.isAuthenticated() || router.createUrlTree(['/login']);
};
