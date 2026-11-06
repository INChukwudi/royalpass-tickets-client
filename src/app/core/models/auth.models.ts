export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export type UserRole = 'SuperAdmin' | 'CustomAdmin' | 'EventAdmin' | 'SalesViewer' | 'GateScanner';

export const ADMIN_PERMISSIONS = {
  viewDashboard: 'dashboard.view',
  manageEvents: 'events.manage',
  viewOrders: 'orders.view',
  createManualOrders: 'orders.manual.create',
  viewTickets: 'tickets.view',
  manageTickets: 'tickets.manage',
  checkInTickets: 'tickets.checkin',
  viewReports: 'reports.view',
  manageUsers: 'users.manage',
  manageOrganization: 'organization.manage',
} as const;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
