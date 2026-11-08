import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/admin/login']);
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole('SuperAdmin', 'EventAdmin')) {
    return true;
  }
  return router.createUrlTree(['/admin/dashboard']);
};

export const roleGuard = (...roles: string[]): CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole(...roles)) {
    return true;
  }
  return router.createUrlTree(['/admin/dashboard']);
};

export const permissionGuard = (permission: string): CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.hasPermission(permission)
    ? true
    : router.createUrlTree([authService.landingRoute()]);
};

export const anyPermissionGuard = (...permissions: string[]): CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return permissions.some(permission => authService.hasPermission(permission))
    ? true
    : router.createUrlTree([authService.landingRoute()]);
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/admin/dashboard']);
};
