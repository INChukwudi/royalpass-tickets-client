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
  manageSeats: 'seats.manage',
  manageReferrals: 'referrals.manage',
  manageEmailDelivery: 'email-delivery.manage',
} as const;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  expiresAt: string;
  user: User;
}

export interface RefreshTokenResponse {
  expiresAt: string;
}
