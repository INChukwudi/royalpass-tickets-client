import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RefreshTokenResponse } from '../models/auth.models';

let refreshInFlight$: Observable<RefreshTokenResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  const isRefreshRequest = req.url.endsWith('/auth/refresh');
  const isLogoutRequest = req.url.endsWith('/auth/logout');
  const authReq = req.clone({ withCredentials: true });

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
          switchMap(() => next(req.clone({ withCredentials: true }))),
          catchError(refreshError => {
            authService.clearSession();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
