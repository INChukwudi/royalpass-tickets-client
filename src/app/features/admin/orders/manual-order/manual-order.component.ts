import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../../../../core/services/admin.service';
import { EventService } from '../../../../core/services/event.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CreateManualOrderResponse } from '../../../../core/models/admin.models';
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

  readonly form = this.fb.nonNullable.group({
    eventId: ['', Validators.required],
    ticketTypeId: ['', Validators.required],
    buyerName: ['', [Validators.required, Validators.maxLength(256)]],
    buyerEmail: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    buyerPhone: ['', [Validators.required, Validators.maxLength(50)]],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
    amountPaid: [0, [Validators.required, Validators.min(0)]],
    paymentMethod: ['Cash', Validators.required],
    externalReference: [''],
    purchasedAt: [this.localDateTime(), Validators.required],
    notes: [''],
    sendEmail: [true],
    assignSeats: [true]
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
    this.selectedEvent.set(null);
    if (!eventId) return;
    this.loadingTicketTypes.set(true);
    this.eventsService.getEvent(eventId).subscribe({
      next: event => {
        this.selectedEvent.set(event);
        this.loadingTicketTypes.set(false);
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
      purchasedAt: new Date(value.purchasedAt).toISOString()
    }).subscribe({
      next: response => {
        this.result.set(response);
        this.saving.set(false);
        response.emailSent
          ? this.toast.success('Manual sale recorded and tickets emailed.')
          : this.toast.warning(response.emailStatus, 8000);
      },
      error: error => {
        this.saving.set(false);
        this.toast.error(error?.error?.message ?? 'Could not record the manual sale.');
      }
    });
  }

  startAnother(): void {
    this.result.set(null);
    this.form.reset({
      eventId: '', ticketTypeId: '', buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1,
      amountPaid: 0, paymentMethod: 'Cash', externalReference: '', purchasedAt: this.localDateTime(),
      notes: '', sendEmail: true, assignSeats: true
    });
    this.selectedEvent.set(null);
  }

  private localDateTime(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }
}
