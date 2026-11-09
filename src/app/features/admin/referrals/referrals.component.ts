import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { ADMIN_PERMISSIONS } from '../../../core/models/auth.models';
import { ReferralUsageReport } from '../../../core/models/admin.models';
import { EventSummaryDto } from '../../../core/models/event.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-referrals',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './referrals.component.html',
  styleUrl: './referrals.component.scss'
})
export class ReferralsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly eventsService = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly report = signal<ReferralUsageReport | null>(null);
  readonly events = signal<EventSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly toggling = signal<string | null>(null);
  readonly canManage = this.auth.hasPermission(ADMIN_PERMISSIONS.manageReferrals)
    || this.auth.hasPermission(ADMIN_PERMISSIONS.manageOrganization);
  readonly canExport = this.auth.hasPermission(ADMIN_PERMISSIONS.viewReports);
  selectedEventId = '';
  importText = '';

  ngOnInit(): void {
    this.eventsService.listEvents(1, 100).subscribe({next: response => this.events.set(response.items)});
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.referralReport(this.selectedEventId || undefined).subscribe({
      next: report => { this.report.set(report); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Could not load referral usage.'); }
    });
  }

  importCodes(): void {
    const codes = this.importText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const separator = line.indexOf(',');
      return separator < 0
        ? {code: line, label: null}
        : {code: line.slice(0, separator).trim(), label: line.slice(separator + 1).trim() || null};
    });
    if (!codes.length || codes.some(item => !item.code)) {
      this.toast.warning('Enter at least one code. Use CODE, Label on each line.');
      return;
    }
    this.saving.set(true);
    this.admin.importReferralCodes(codes).subscribe({
      next: result => {
        this.saving.set(false);
        this.importText = '';
        this.toast.success(`${result.created} code(s) added and ${result.updated} updated.`);
        this.load();
      },
      error: error => { this.saving.set(false); this.toast.error(error?.error?.message ?? 'Could not import referral codes.'); }
    });
  }

  toggle(id: string, isActive: boolean): void {
    this.toggling.set(id);
    this.admin.setReferralCodeStatus(id, isActive).subscribe({
      next: () => { this.toggling.set(null); this.load(); },
      error: () => { this.toggling.set(null); this.toast.error('Could not update the referral code.'); }
    });
  }

  export(): void {
    this.admin.report('referrals', this.selectedEventId || undefined).subscribe({next: blob => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'referral-usage.xlsx'; anchor.click(); URL.revokeObjectURL(url);
    }});
  }
}
