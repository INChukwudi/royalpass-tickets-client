import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RefreshTokenResponse } from '../models/auth.models';

let refreshInFlight$: Observable<RefreshTokenResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  const isRefreshRequest = req.url.endsWith('/auth/refresh');
  const token = authService.getAccessToken();
  const authReq = token && !isRefreshRequest
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefreshRequest && authService.getRefreshToken()) {
        refreshInFlight$ ??= http.post<RefreshTokenResponse>(`${environment.apiUrl}/auth/refresh`, {
          refreshToken: authService.getRefreshToken()
        }).pipe(
          tap(response => authService.storeTokens(response.accessToken, response.refreshToken)),
          finalize(() => { refreshInFlight$ = null; }),
          shareReplay({ bufferSize: 1, refCount: false })
        );

        return refreshInFlight$.pipe(
          switchMap(response => {
            const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${response.accessToken}` } });
            return next(retryReq);
          }),
          catchError(refreshError => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
