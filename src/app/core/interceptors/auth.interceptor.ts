import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
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
    csrfInFlight$ ??= http.get<{ token: string }>(`${environment.apiUrl}/auth/csrf`, {
      withCredentials: true
    }).pipe(
      finalize(() => { csrfInFlight$ = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return csrfInFlight$.pipe(
      switchMap(response => {
        authService.setCsrfToken(response.token);
        return next(withSecurity(req, response.token));
      })
    );
  }

  const authReq = withSecurity(req, authService.csrfToken());

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
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
    })
  );
};

function withSecurity(req: HttpRequest<unknown>, csrfToken: string | null): HttpRequest<unknown> {
  const headers = csrfToken && unsafeMethods.has(req.method.toUpperCase())
    ? { 'X-XSRF-TOKEN': csrfToken }
    : undefined;
  return req.clone({ withCredentials: true, setHeaders: headers });
}
