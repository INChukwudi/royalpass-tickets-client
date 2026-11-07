import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../core/services/event.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { EventDetailDto, TicketTypeDto } from '../../../core/models/event.models';

declare const AOS: any;

interface CartItem {
  ticketType: TicketTypeDto;
  quantity: number;
}

@Component({
  selector: 'app-event-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyPipe, DatePipe, MatProgressSpinnerModule],
  templateUrl: './event-landing.component.html',
  styleUrl: './event-landing.component.scss'
})
export class EventLandingComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  // State
  events = signal<EventDetailDto[]>([]);
  selectedEvent = signal<EventDetailDto | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);

  // Cart: ticketTypeId -> quantity
  cart = signal<Record<string, number>>({});

  // Buyer details
  buyerName = '';
  buyerEmail = '';
  buyerPhone = '';
  referralCode = '';

  // Step: 'events' | 'select' | 'details' | 'review'
  step = signal<'events' | 'select' | 'details' | 'review'>('events');

  cartItems = computed<CartItem[]>(() => {
    const evt = this.selectedEvent();
    if (!evt) return [];
    return evt.ticketTypes
      .filter(tt => (this.cart()[tt.id] ?? 0) > 0)
      .map(tt => ({ ticketType: tt, quantity: this.cart()[tt.id] }));
  });

  cartTotal = computed(() =>
    this.cartItems().reduce((sum, i) => sum + i.ticketType.price * i.quantity, 0)
  );

  hasCart = computed(() => this.cartItems().length > 0);

  ngOnInit(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.isLoading.set(true);
    this.eventService.listEvents(1, 100, true).subscribe({
      next: res => {
        // Load full details for each event (for ticket types)
        const ids = res.items.map(e => e.id);
        if (ids.length === 0) { this.isLoading.set(false); return; }
        let loaded = 0;
        const details: EventDetailDto[] = [];
        ids.forEach(id => {
          this.eventService.getEvent(id).subscribe({
            next: evt => {
              details.push(evt);
              loaded++;
              if (loaded === ids.length) {
                details.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
                this.events.set(details.filter(e => e.isSalesOpen));
                this.isLoading.set(false);
                setTimeout(() => { if (typeof AOS !== 'undefined') AOS.refresh(); }, 100);
              }
            },
            error: () => { loaded++; if (loaded === ids.length) this.isLoading.set(false); }
          });
        });
      },
      error: () => { this.isLoading.set(false); }
    });
  }

  selectEvent(evt: EventDetailDto): void {
    this.selectedEvent.set(evt);
    this.cart.set({});
    this.referralCode = '';
    this.step.set('select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getQty(ticketTypeId: string): number {
    return this.cart()[ticketTypeId] ?? 0;
  }

  setQty(ticketTypeId: string, value: number, max: number): void {
    const qty = Math.max(0, Math.min(value, max));
    if (qty > 0) {
      // The current order model represents one ticket type per order.
      this.cart.set({ [ticketTypeId]: qty });
      return;
    }

    this.cart.update(current => {
      const next = { ...current };
      delete next[ticketTypeId];
      return next;
    });
  }

  increment(tt: TicketTypeDto): void { this.setQty(tt.id, this.getQty(tt.id) + 1, tt.maxPerBuyer); }
  decrement(tt: TicketTypeDto): void { this.setQty(tt.id, this.getQty(tt.id) - 1, tt.maxPerBuyer); }

  proceedToDetails(): void {
    if (!this.hasCart()) { this.toast.warning('Please select at least one ticket.'); return; }
    this.step.set('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  proceedToReview(): void {
    if (!this.buyerName.trim()) { this.toast.warning('Please enter your full name.'); return; }
    if (!this.buyerEmail.trim() || !this.buyerEmail.includes('@')) { this.toast.warning('Please enter a valid email.'); return; }
    if (!this.buyerPhone.trim()) { this.toast.warning('Please enter your phone number.'); return; }
    this.step.set('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  placeOrder(): void {
    const items = this.cartItems();
    if (items.length === 0) return;
    const item = items[0];
    const evt = this.selectedEvent()!;

    this.isSubmitting.set(true);
    const callbackUrl = `${window.location.origin}/tickets/confirmation`;

    this.orderService.initiateOrder({
      eventId: evt.id,
      ticketTypeId: item.ticketType.id,
      quantity: item.quantity,
      buyerName: this.buyerName,
      buyerEmail: this.buyerEmail,
      buyerPhone: this.buyerPhone,
      callbackUrl,
      referralCode: this.referralCode.trim() || null
    }).subscribe({
      next: res => {
        // Redirect to Paystack
        window.location.href = res.paymentUrl;
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message ?? err?.error?.errors?.[0] ?? 'Failed to initiate payment. Please try again.';
        this.toast.error(msg);
      }
    });
  }

  back(): void {
    const cur = this.step();
    if (cur === 'select') this.step.set('events');
    else if (cur === 'details') this.step.set('select');
    else if (cur === 'review') this.step.set('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  readonly features = [
    { icon: 'bolt', title: 'Instant Booking', desc: 'Purchase tickets in under 60 seconds with Paystack\'s seamless payment flow.', delay: 0 },
    { icon: 'qr_code_2', title: 'QR E-Tickets', desc: 'Beautiful digital tickets with scannable QR codes, ready instantly after payment.', delay: 100 },
    { icon: 'shield', title: 'Secure & Verified', desc: 'Every ticket is cryptographically unique. No duplicates, no fraud.', delay: 200 },
  ];

  readonly testimonials = [
    { text: 'The smoothest ticket-buying experience I\'ve ever had for a local concert. The QR check-in was flawless.', name: 'Adaeze Obi', role: 'Music Enthusiast', initials: 'AO', delay: 0 },
    { text: 'Finally, a platform that treats choral music with the prestige it deserves. Stunning design, works perfectly.', name: 'Chukwuemeka Nwosu', role: 'Season Ticket Holder', initials: 'CN', delay: 100 },
    { text: 'Booked for my entire family in minutes. Received beautiful tickets instantly. Will use every time.', name: 'Ngozi Adeleke', role: 'Event Regular', initials: 'NA', delay: 200 },
  ];
}
