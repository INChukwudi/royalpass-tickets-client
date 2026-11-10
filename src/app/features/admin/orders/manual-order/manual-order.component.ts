import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../../../../core/services/admin.service';
import { EventService } from '../../../../core/services/event.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CreateManualOrderResponse, ReferralCode } from '../../../../core/models/admin.models';
import { EventDetailDto, EventSummaryDto, TicketTypeDto } from '../../../../core/models/event.models';

@Component({
  selector: 'app-manual-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatProgressSpinnerModule, CurrencyPipe, DatePipe],
  templateUrl: './manual-order.component.html',
  styleUrl: './manual-order.component.scss'
})
export class ManualOrderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly admin = inject(AdminService);
  private readonly eventsService = inject(EventService);
  private readonly toast = inject(ToastService);

  readonly events = signal<EventSummaryDto[]>([]);
  readonly selectedEvent = signal<EventDetailDto | null>(null);
  readonly loadingEvents = signal(true);
  readonly loadingTicketTypes = signal(false);
  readonly saving = signal(false);
  readonly result = signal<CreateManualOrderResponse | null>(null);
  readonly referralCodes = signal<ReferralCode[]>([]);

  readonly form = this.fb.nonNullable.group({
    eventId: ['', Validators.required],
    ticketTypeId: ['', Validators.required],
    buyerName: ['', [Validators.required, Validators.maxLength(256)]],
    buyerEmail: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    buyerPhone: ['', [Validators.required, Validators.maxLength(50)]],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
    amountPaid: [0, [Validators.required, Validators.min(0), Validators.max(1_000_000_000_000)]],
    paymentMethod: ['Cash', Validators.required],
    externalReference: [''],
    purchasedAt: [this.localDateTime(), Validators.required],
    notes: [''],
    referralCode: [''],
    sendEmail: [true],
    assignSeats: [false]
  });

  ngOnInit(): void {
    this.eventsService.listEvents(1, 100).subscribe({
      next: response => {
        this.events.set(response.items);
        this.loadingEvents.set(false);
      },
      error: () => {
        this.loadingEvents.set(false);
        this.toast.error('Could not load events.');
      }
    });
  }

  get ticketTypes(): TicketTypeDto[] {
    return this.selectedEvent()?.ticketTypes ?? [];
  }

  get selectedTicketType(): TicketTypeDto | undefined {
    return this.ticketTypes.find(item => item.id === this.form.controls.ticketTypeId.value);
  }

  onEventChange(): void {
    const eventId = this.form.controls.eventId.value;
    this.form.controls.ticketTypeId.setValue('');
    this.form.controls.referralCode.setValue('');
    this.selectedEvent.set(null);
    this.referralCodes.set([]);
    if (!eventId) return;
    this.loadingTicketTypes.set(true);
    this.eventsService.getEvent(eventId).subscribe({
      next: event => {
        this.selectedEvent.set(event);
        this.loadingTicketTypes.set(false);
        this.admin.eventReferralCodes(eventId).subscribe({next: codes => this.referralCodes.set(codes)});
      },
      error: () => {
        this.loadingTicketTypes.set(false);
        this.toast.error('Could not load ticket types.');
      }
    });
  }

  updateSuggestedAmount(): void {
    const type = this.selectedTicketType;
    if (type) this.form.controls.amountPaid.setValue(type.price * this.form.controls.quantity.value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Complete the required purchase details.');
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    this.admin.createManualOrder({
      ...value,
      externalReference: value.externalReference.trim() || null,
      notes: value.notes.trim() || null,
      referralCode: value.referralCode || null,
      purchasedAt: new Date(value.purchasedAt).toISOString()
    }).subscribe({
      next: response => {
        this.result.set(response);
        this.saving.set(false);
        response.emailQueued
          ? this.toast.success('Manual sale recorded and ticket email queued.')
          : this.toast.warning(response.emailStatus, 8000);
      },
      error: error => {
        this.saving.set(false);
        this.toast.error(this.errorMessage(error));
      }
    });
  }

  startAnother(): void {
    this.result.set(null);
    this.form.reset({
      eventId: '', ticketTypeId: '', buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1,
      amountPaid: 0, paymentMethod: 'Cash', externalReference: '', purchasedAt: this.localDateTime(),
      notes: '', referralCode: '', sendEmail: true, assignSeats: false
    });
    this.selectedEvent.set(null);
    this.referralCodes.set([]);
  }

  private localDateTime(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  private errorMessage(error: any): string {
    const body = error?.error;
    if (typeof body?.message === 'string' && body.message.trim()) return body.message;
    if (typeof body?.detail === 'string' && body.detail.trim()) return body.detail;

    const errors = body?.errors;
    if (Array.isArray(errors)) {
      const first = errors.find(item => typeof item === 'string' || item?.reason || item?.errorMessage);
      if (typeof first === 'string') return first;
      if (first?.reason) return first.reason;
      if (first?.errorMessage) return first.errorMessage;
    }
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors).flat().find(item => typeof item === 'string');
      if (typeof first === 'string') return first;
    }
    if (error?.status === 409) return 'Another sale changed this inventory. Please review availability and try again.';
    return 'Could not record the manual sale. No sale was saved; please review the details and try again.';
  }
}
