import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthRepository } from '../repositories/auth.repository';
import { ApiEndpoints } from '../repositories/api-endpoints';
import { AuthStore } from '../store/auth/auth.store';

// Attaches the access token + credentials to every request, and transparently
// refreshes-and-retries once on a 401 (expired access token) before giving
// up. Talks to AuthRepository directly rather than going through AuthStore's
// rxMethod (which is fire-and-forget, not something you can await a result
// from) — an interceptor is infrastructure/plumbing, not a component, so it's
// a deliberate exception to the "only services use stores" rule.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const authRepository = inject(AuthRepository);

  const authReq = attachAuth(req, authStore.accessToken());

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const isAuthEndpoint = req.url.startsWith(ApiEndpoints.AUTH);
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      return authRepository.refresh().pipe(
        switchMap(({ accessToken }) => {
          authStore.setAccessToken(accessToken);
          return next(attachAuth(req, accessToken));
        }),
        catchError((refreshError: unknown) => {
          authStore.setAccessToken(null);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function attachAuth(
  req: HttpRequest<unknown>,
  accessToken: string | null,
): HttpRequest<unknown> {
  return req.clone({
    withCredentials: true,
    ...(accessToken ? { setHeaders: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
}
