import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { ADMIN_PERMISSIONS } from '../../core/models/auth.models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatMenuModule, MatDividerModule,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  readonly sidenavOpen = signal(window.innerWidth >= 992);
  readonly sidenavMode = signal<'side' | 'over'>(window.innerWidth >= 992 ? 'side' : 'over');

  private readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'dashboard',          route: '/admin/dashboard', permission: ADMIN_PERMISSIONS.viewDashboard },
    { label: 'Events',       icon: 'event',              route: '/admin/events', permission: ADMIN_PERMISSIONS.manageEvents },
    { label: 'Orders',       icon: 'receipt_long',       route: '/admin/orders', permission: ADMIN_PERMISSIONS.viewOrders },
    { label: 'Manual Sale',  icon: 'post_add',           route: '/admin/orders/manual', permission: ADMIN_PERMISSIONS.createManualOrders },
    { label: 'Tickets',      icon: 'confirmation_number',route: '/admin/tickets', permission: ADMIN_PERMISSIONS.viewTickets },
    { label: 'Gate Scanner', icon: 'qr_code_scanner',    route: '/admin/scanner', permission: ADMIN_PERMISSIONS.checkInTickets },
    { label: 'Reports',      icon: 'bar_chart',          route: '/admin/reports', permission: ADMIN_PERMISSIONS.viewReports },
    { label: 'Users',        icon: 'manage_accounts',    route: '/admin/users', permission: ADMIN_PERMISSIONS.manageUsers },
    { label: 'Organization', icon: 'business',           route: '/admin/organization', permission: ADMIN_PERMISSIONS.manageOrganization },
  ];

  readonly visibleNavItems = computed(() => {
    return this.navItems.filter(item => this.authService.hasPermission(item.permission));
  });

  readonly userInitials = computed(() => {
    const name = this.currentUser()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  });

  readonly isMobile = signal(window.innerWidth < 992);

  @HostListener('window:resize')
  onResize() {
    const mobile = window.innerWidth < 992;
    this.isMobile.set(mobile);
    this.sidenavMode.set(mobile ? 'over' : 'side');
    if (!mobile) {
      this.sidenavOpen.set(true);
    } else {
      this.sidenavOpen.set(false);
    }
  }

  toggleSidenav() {
    this.sidenavOpen.update(v => !v);
  }

  closeOnMobile() {
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }
  }

  logout() {
    this.authService.logout();
  }
}
