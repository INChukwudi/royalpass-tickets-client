import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/guards/auth.guard';
import { ADMIN_PERMISSIONS } from './core/models/auth.models';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/public/event-landing/event-landing.component').then(m => m.EventLandingComponent)
      },
      {
        path: 'tickets/lookup',
        loadComponent: () =>
          import('./features/public/ticket-lookup/ticket-lookup.component').then(m => m.TicketLookupComponent)
      },
      {
        path: 'tickets/confirmation',
        loadComponent: () =>
          import('./features/public/ticket-confirmation/ticket-confirmation.component').then(m => m.TicketConfirmationComponent)
      },
      {
        path: 'tickets/confirmation/:reference',
        loadComponent: () =>
          import('./features/public/ticket-confirmation/ticket-confirmation.component').then(m => m.TicketConfirmationComponent)
      },
      {
        path: 'tickets/transfers/:token',
        loadComponent: () =>
          import('./features/public/ticket-transfer/ticket-transfer.component').then(m => m.TicketTransferComponent)
      },
    ]
  },

  // Admin auth routes (guest only)
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },

  // Admin protected routes
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.viewDashboard)],
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'events',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageEvents)],
        loadComponent: () =>
          import('./features/admin/events/event-list/event-list.component').then(m => m.EventListComponent)
      },
      {
        path: 'events/new',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageEvents)],
        loadComponent: () =>
          import('./features/admin/events/event-form/event-form.component').then(m => m.EventFormComponent)
      },
      {
        path: 'events/:id/edit',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageEvents)],
        loadComponent: () =>
          import('./features/admin/events/event-form/event-form.component').then(m => m.EventFormComponent)
      },
      {
        path: 'orders',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.viewOrders)],
        loadComponent: () =>
          import('./features/admin/orders/order-list/order-list.component').then(m => m.OrderListComponent)
      },
      {
        path: 'orders/manual',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.createManualOrders)],
        loadComponent: () =>
          import('./features/admin/orders/manual-order/manual-order.component').then(m => m.ManualOrderComponent)
      },
      {
        path: 'orders/:reference/seats',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageSeats)],
        loadComponent: () => import('./features/admin/orders/seat-allocation/admin-seat-allocation.component').then(m => m.AdminSeatAllocationComponent)
      },
      {
        path: 'tickets',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.viewTickets)],
        loadComponent: () =>
          import('./features/admin/tickets/ticket-list/ticket-list.component').then(m => m.TicketListComponent)
      },
      {
        path: 'scanner',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.checkInTickets)],
        loadComponent: () =>
          import('./features/admin/scanner/scanner.component').then(m => m.ScannerComponent)
      },
      {
        path: 'reports',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.viewReports)],
        loadComponent: () =>
          import('./features/admin/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'referrals',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageReferrals)],
        loadComponent: () =>
          import('./features/admin/referrals/referrals.component').then(m => m.ReferralsComponent)
      },
      {
        path: 'users',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageUsers)],
        loadComponent: () =>
          import('./features/admin/users/user-list/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'organization',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageOrganization)],
        loadComponent: () =>
          import('./features/admin/organization/organization-settings.component').then(m => m.OrganizationSettingsComponent)
      },
      {
        path: 'email-deliveries',
        canActivate: [permissionGuard(ADMIN_PERMISSIONS.manageEmailDelivery)],
        loadComponent: () =>
          import('./features/admin/email-deliveries/email-deliveries.component').then(m => m.EmailDeliveriesComponent)
      },
    ]
  },

  { path: '**', redirectTo: '' }
];
