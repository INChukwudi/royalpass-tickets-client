import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, User } from '../models/auth.models';

const USER_KEY = 'ct_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<User | null>(this.loadUser());
  private readonly _isLoading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isLoading = this._isLoading.asReadonly();
  readonly userRole = computed(() => this._currentUser()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest) {
    this._isLoading.set(true);
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap(response => {
        this.storeUser(response.user);
        this._currentUser.set(response.user);
        this._isLoading.set(false);
      }),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  logout() {
    this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}).pipe(
      finalize(() => this.clearSession())
    ).subscribe();
  }

  clearSession() {
    localStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/admin/login']);
  }

  storeUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  hasRole(...roles: string[]): boolean {
    const role = this._currentUser()?.role;
    return role != null && roles.includes(role);
  }

  hasPermission(permission: string): boolean {
    const user = this._currentUser();
    return user?.role === 'SuperAdmin' || user?.permissions?.includes(permission) === true;
  }

  landingRoute(): string {
    const choices: Array<[string, string]> = [
      ['dashboard.view', '/admin/dashboard'], ['events.manage', '/admin/events'],
      ['orders.view', '/admin/orders'], ['orders.manual.create', '/admin/orders/manual'],
      ['tickets.view', '/admin/tickets'], ['tickets.checkin', '/admin/scanner'],
        ['seats.manage', '/admin/tickets'], ['referrals.manage', '/admin/referrals'],
        ['email-delivery.manage', '/admin/email-deliveries'],
        ['reports.view', '/admin/reports'], ['users.manage', '/admin/users'],
        ['organization.manage', '/admin/organization']
    ];
    return choices.find(([permission]) => this.hasPermission(permission))?.[1] ?? '/admin/login';
  }

  private loadUser(): User | null {
    try {
      localStorage.removeItem('ct_access_token');
      localStorage.removeItem('ct_refresh_token');
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
