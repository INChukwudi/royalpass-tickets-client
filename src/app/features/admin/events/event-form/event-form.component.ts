import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../../core/services/event.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EventDetailDto, TicketTypeDto } from '../../../../core/models/event.models';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss'
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly toast = inject(ToastService);

  readonly eventId = signal<string | null>(null);
  readonly isEditMode = signal(false);
  readonly isSaving = signal(false);
  readonly isLoadingEvent = signal(false);
  readonly event = signal<EventDetailDto | null>(null);
  readonly bannerPreview = signal<string | null>(null);
  readonly bannerFile = signal<File | null>(null);
  readonly activeTab = signal<'details' | 'tickets'>('details');
  readonly savingTicketIndex = signal<number | null>(null);
  readonly deletingTicketId = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(512)]],
    eventDate: ['', Validators.required],
    seatSelectionClosesAt: [''],
    venue: ['', [Validators.required, Validators.maxLength(512)]],
    description: ['', Validators.required],
    organizerContact: ['', [Validators.required, Validators.maxLength(512)]],
    organizerEmail: ['', Validators.email],
    organizerPhone: [''],
    isPublished: [false]
  });

  readonly ticketForm: FormGroup = this.fb.group({
    types: this.fb.array([])
  });

  get ticketTypes(): FormArray { return this.ticketForm.get('types') as FormArray; }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.eventId.set(id);
      this.isEditMode.set(true);
      this.loadEvent(id);
    }
  }

  private loadEvent(id: string) {
    this.isLoadingEvent.set(true);
    this.eventService.getEvent(id).subscribe({
      next: evt => {
        this.event.set(evt);
        const localDate = new Date(evt.eventDate);
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${localDate.getFullYear()}-${pad(localDate.getMonth()+1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
        const closeDate = evt.seatSelectionClosesAt ? new Date(evt.seatSelectionClosesAt) : null;
        const closeStr = closeDate ? `${closeDate.getFullYear()}-${pad(closeDate.getMonth()+1)}-${pad(closeDate.getDate())}T${pad(closeDate.getHours())}:${pad(closeDate.getMinutes())}` : '';
        this.form.patchValue({ ...evt, eventDate: dateStr, seatSelectionClosesAt: closeStr });
        if (evt.bannerUrl) this.bannerPreview.set(evt.bannerUrl);
        this.ticketTypes.clear();
        evt.ticketTypes.forEach(tt => this.ticketTypes.push(this.buildTicketTypeGroup(tt)));
        this.isLoadingEvent.set(false);
      },
      error: () => {
        this.toast.error('Could not load event.');
        this.isLoadingEvent.set(false);
      }
    });
  }

  private buildTicketTypeGroup(tt?: Partial<TicketTypeDto>): FormGroup {
    return this.fb.group({
      id: [tt?.id ?? null],
      name: [tt?.name ?? '', [Validators.required, Validators.maxLength(256)]],
      price: [tt?.price ?? 0, [Validators.required, Validators.min(0)]],
      totalQuantity: [tt?.totalQuantity ?? 100, [Validators.required, Validators.min(1)]],
      maxPerBuyer: [tt?.maxPerBuyer ?? 10, [Validators.required, Validators.min(1)]],
      description: [tt?.description ?? ''],
      isVisible: [tt?.isVisible ?? true],
      sortOrder: [tt?.sortOrder ?? 0],
      salesStartDate: [tt?.salesStartDate ? tt.salesStartDate.slice(0,16) : ''],
      salesEndDate: [tt?.salesEndDate ? tt.salesEndDate.slice(0,16) : ''],
    });
  }

  addTicketType() {
    this.ticketTypes.push(this.buildTicketTypeGroup());
  }

  onBannerChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.toast.error('Banner must be under 5 MB.'); return; }
    this.bannerFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.bannerPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true);
    const val = this.form.value;
    const payload = { ...val, eventDate: new Date(val.eventDate).toISOString(),
      seatSelectionClosesAt: val.seatSelectionClosesAt ? new Date(val.seatSelectionClosesAt).toISOString() : null };

    const save$ = this.isEditMode()
      ? this.eventService.updateEvent(this.eventId()!, payload)
      : this.eventService.createEvent(payload);

    save$.subscribe({
      next: result => {
        const id = this.isEditMode() ? this.eventId()! : (result as any).id;
        if (this.bannerFile()) {
          this.eventService.uploadBanner(id, this.bannerFile()!).subscribe({
            next: () => this.afterSave(id),
            error: () => { this.toast.warning('Event saved but banner upload failed.'); this.afterSave(id); }
          });
        } else {
          this.afterSave(id);
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Failed to save event.');
        this.isSaving.set(false);
      }
    });
  }

  private afterSave(id: string) {
    this.isSaving.set(false);
    this.toast.success(this.isEditMode() ? 'Event updated.' : 'Event created.');
    if (!this.isEditMode()) {
      this.router.navigate(['/admin/events', id, 'edit']);
    } else {
      this.loadEvent(id);
    }
  }

  saveTicketType(index: number) {
    const ctrl = this.ticketTypes.at(index) as FormGroup;
    if (ctrl.invalid) { ctrl.markAllAsTouched(); return; }
    this.savingTicketIndex.set(index);
    const val = ctrl.value;
    const payload = {
      name: val.name, price: val.price, totalQuantity: val.totalQuantity,
      maxPerBuyer: val.maxPerBuyer, description: val.description || null,
      isVisible: val.isVisible, sortOrder: val.sortOrder,
      salesStartDate: val.salesStartDate ? new Date(val.salesStartDate).toISOString() : null,
      salesEndDate: val.salesEndDate ? new Date(val.salesEndDate).toISOString() : null,
    };
    const save$ = val.id
      ? this.eventService.updateTicketType(val.id, payload)
      : this.eventService.createTicketType(this.eventId()!, payload);
    save$.subscribe({
      next: (saved) => { ctrl.patchValue({ id: (saved as any).id }); this.toast.success('Ticket type saved.'); this.savingTicketIndex.set(null); },
      error: (err) => { this.toast.error(err?.error?.message ?? 'Failed to save ticket type.'); this.savingTicketIndex.set(null); }
    });
  }

  deleteTicketType(index: number) {
    const ctrl = this.ticketTypes.at(index) as FormGroup;
    const id = ctrl.value.id;
    if (!id) { this.ticketTypes.removeAt(index); return; }
    this.deletingTicketId.set(id);
    this.eventService.deleteTicketType(id).subscribe({
      next: () => { this.ticketTypes.removeAt(index); this.toast.success('Ticket type removed.'); this.deletingTicketId.set(null); },
      error: (err) => { this.toast.error(err?.error?.message ?? 'Cannot delete this ticket type.'); this.deletingTicketId.set(null); }
    });
  }

  hasError(ctrl: AbstractControl | null, error: string): boolean {
    return !!ctrl && ctrl.invalid && ctrl.touched && ctrl.hasError(error);
  }

  getCtrl(name: string) { return this.form.get(name); }
}
