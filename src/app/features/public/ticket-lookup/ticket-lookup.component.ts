import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { OrderLookupDto } from '../../../core/models/order.models';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { publicErrorMessage } from '../../../core/utils/public-error-message';

@Component({
  selector: 'app-ticket-lookup', standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DatePipe, MatProgressSpinnerModule],
  templateUrl: './ticket-lookup.component.html', styleUrl: './ticket-lookup.component.scss'
})
export class TicketLookupComponent {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  reference = '';
  email = '';
  readonly isLoading = signal(false);
  readonly actionReference = signal<string | null>(null);
  readonly results = signal<OrderLookupDto[] | null>(null);

  search(): void {
    if (!this.reference.trim() || !this.email.trim()) {
      this.toast.warning('Enter both your booking reference and purchase email.');
      return;
    }
    this.isLoading.set(true); this.results.set(null);
    this.orders.lookupOrders(this.reference.trim().toUpperCase(), this.email.trim()).subscribe({
      next: response => {
        this.results.set(response.data ?? []); this.isLoading.set(false);
        if (!(response.data ?? []).length) this.toast.info('No paid booking matched those details.');
      },
      error: () => { this.isLoading.set(false); this.toast.error('Search failed. Please try again.'); }
    });
  }

  resend(reference: string): void {
    this.actionReference.set(reference);
    this.orders.resendTickets(reference, this.email.trim()).subscribe({
      next: response => { this.toast.success(response.message ?? 'Ticket email queued.'); this.actionReference.set(null); },
      error: error => { this.toast.error(publicErrorMessage(error, 'Could not resend the ticket email. Please try again later.')); this.actionReference.set(null); }
    });
  }
}
