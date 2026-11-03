import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { OrderLookupDto } from '../../../core/models/order.models';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ticket-lookup',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DatePipe, MatProgressSpinnerModule],
  templateUrl: './ticket-lookup.component.html',
  styleUrl: './ticket-lookup.component.scss'
})
export class TicketLookupComponent {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  searchType: 'email' | 'reference' = 'email';
  searchValue = '';

  isLoading = signal(false);
  actionReference = signal<string | null>(null);
  results = signal<OrderLookupDto[] | null>(null);
  apiBase = environment.apiUrl.replace('/api', '');

  search(): void {
    if (!this.searchValue.trim()) {
      this.toast.warning('Please enter a search value.');
      return;
    }
    this.isLoading.set(true);
    this.results.set(null);

    const params = this.searchType === 'email'
      ? { email: this.searchValue.trim() }
      : { reference: this.searchValue.trim().toUpperCase() };

    this.orderService.lookupOrders(params).subscribe({
      next: res => {
        this.results.set(res.data ?? []);
        this.isLoading.set(false);
        if ((res.data ?? []).length === 0) {
          this.toast.info('No tickets found for that search.');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Search failed. Please try again.');
      }
    });
  }

  qrUrl(path: string): string {
    return `${this.apiBase}${path}`;
  }

  downloadOrder(reference: string): void {
    this.actionReference.set(reference);
    this.orderService.downloadOrderPdf(reference).subscribe({
      next: pdf => {
        this.orderService.saveDownload(pdf, `RoyalPass-${reference}.pdf`);
        this.actionReference.set(null);
      },
      error: () => {
        this.toast.error('Could not download these tickets.');
        this.actionReference.set(null);
      }
    });
  }

  resend(reference: string): void {
    this.actionReference.set(reference);
    this.orderService.resendTickets(reference).subscribe({
      next: response => {
        this.toast.success(response.message ?? 'Ticket email queued.');
        this.actionReference.set(null);
      },
      error: () => {
        this.toast.error('Could not resend the ticket email.');
        this.actionReference.set(null);
      }
    });
  }
}
