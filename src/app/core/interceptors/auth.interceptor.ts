import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpClient, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { RefreshTokenResponse } from '../models/auth.models';
import { Router } from '@angular/router';

let refreshInFlight$: Observable<RefreshTokenResponse> | null = null;
let csrfInFlight$: Observable<{ token: string }> | null = null;

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);

  const isRefreshRequest = req.url.endsWith('/auth/refresh');
  const isLogoutRequest = req.url.endsWith('/auth/logout');
  const isCsrfRequest = req.url.endsWith('/auth/csrf');
  const needsCsrf = unsafeMethods.has(req.method.toUpperCase())
    && req.url.startsWith(environment.apiUrl)
    && authService.isAuthenticated()
    && !isCsrfRequest;

  if (needsCsrf && !authService.csrfToken()) {
    return getCsrfToken(http).pipe(
      switchMap(response => {
        authService.setCsrfToken(response.token);
        return next(withSecurity(req, response.token));
      }),
      catchError(error => handleRequestError(error, req, next, http, authService, router, needsCsrf, isRefreshRequest, isLogoutRequest))
    );
  }

  const authReq = withSecurity(req, authService.csrfToken());

  return next(authReq).pipe(
    catchError(error => handleRequestError(error, req, next, http, authService, router, needsCsrf, isRefreshRequest, isLogoutRequest))
  );
};

function handleRequestError(
  error: HttpErrorResponse,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  http: HttpClient,
  authService: AuthService,
  router: Router,
  needsCsrf: boolean,
  isRefreshRequest: boolean,
  isLogoutRequest: boolean
): Observable<HttpEvent<unknown>> {
  if (needsCsrf && isAntiforgeryError(error)) {
    authService.clearCsrfToken();
    return getCsrfToken(http).pipe(
      switchMap(response => {
        authService.setCsrfToken(response.token);
        // Retry exactly once. This retry is sent directly to the next handler, so another
        // antiforgery rejection is returned to the caller instead of looping indefinitely.
        return next(withSecurity(req, response.token));
      })
    );
  }

  if (error.status === 401 && !isRefreshRequest && !isLogoutRequest && authService.isAuthenticated()) {
    refreshInFlight$ ??= http.post<RefreshTokenResponse>(`${environment.apiUrl}/auth/refresh`, {}, {
      withCredentials: true
    }).pipe(
      finalize(() => { refreshInFlight$ = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return refreshInFlight$.pipe(
      switchMap(() => next(withSecurity(req, authService.csrfToken()))),
      catchError(refreshError => {
        authService.expireSession(router.url);
        return throwError(() => refreshError);
      })
    );
  }
  return throwError(() => error);
}

function getCsrfToken(http: HttpClient): Observable<{ token: string }> {
  csrfInFlight$ ??= http.get<{ token: string }>(`${environment.apiUrl}/auth/csrf`, {
    withCredentials: true
  }).pipe(
    finalize(() => { csrfInFlight$ = null; }),
    shareReplay({ bufferSize: 1, refCount: false })
  );
  return csrfInFlight$;
}

function isAntiforgeryError(error: HttpErrorResponse): boolean {
  return error.status === 400
    && error.error?.message === 'The request security token is missing or invalid.';
}

function withSecurity(req: HttpRequest<unknown>, csrfToken: string | null): HttpRequest<unknown> {
  const headers = csrfToken && unsafeMethods.has(req.method.toUpperCase())
    ? { 'X-XSRF-TOKEN': csrfToken }
    : undefined;
  return req.clone({ withCredentials: true, setHeaders: headers });
}
