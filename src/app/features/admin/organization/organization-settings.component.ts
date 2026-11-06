import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { OrganizationPaymentSettings } from '../../../core/models/admin.models';

@Component({
  selector: 'app-organization-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  templateUrl: './organization-settings.component.html',
  styleUrl: './organization-settings.component.scss'
})
export class OrganizationSettingsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly settings = signal<OrganizationPaymentSettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  secretKey = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.organizationPaymentSettings().subscribe({
      next: settings => { this.settings.set(settings); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Could not load organization payment settings.'); }
    });
  }

  saveKey(): void {
    const key = this.secretKey.trim();
    if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
      this.toast.warning('Enter a Paystack secret key beginning with sk_test_ or sk_live_.');
      return;
    }
    this.save({ secretKey: key, useEnvironmentFallback: false }, 'Organization Paystack key saved securely.');
  }

  useFallback(): void {
    if (!this.settings()?.environmentFallbackAvailable) {
      this.toast.warning('No environment Paystack key is configured.');
      return;
    }
    this.save({ secretKey: null, useEnvironmentFallback: true }, 'Organization key removed. Environment fallback is active.');
  }

  private save(request: { secretKey: string | null; useEnvironmentFallback: boolean }, message: string): void {
    this.saving.set(true);
    this.admin.saveOrganizationPaymentSettings(request).subscribe({
      next: settings => {
        this.settings.set(settings);
        this.secretKey = '';
        this.saving.set(false);
        this.toast.success(message);
      },
      error: error => {
        this.saving.set(false);
        this.toast.error(error?.error?.message ?? 'Could not save payment settings.');
      }
    });
  }
}
