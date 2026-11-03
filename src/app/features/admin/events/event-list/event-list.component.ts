import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { EventService } from '../../../../core/services/event.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EventSummaryDto } from '../../../../core/models/event.models';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [RouterLink, DatePipe, NgClass, DecimalPipe, MatCardModule, MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.scss'
})
export class EventListComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly toast = inject(ToastService);

  readonly events = signal<EventSummaryDto[]>([]);
  readonly isLoading = signal(true);
  readonly total = signal(0);

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.isLoading.set(true);
    this.eventService.listEvents().subscribe({
      next: res => {
        this.events.set(res.items);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load events.');
        this.isLoading.set(false);
      }
    });
  }

  toggleStatus(evt: EventSummaryDto) {
    if (!evt.isPublished && !evt.isSalesOpen) {
      this.toast.warning('Publish the event before opening sales.');
      return;
    }
    this.eventService.setStatus(evt.id, !evt.isSalesOpen).subscribe({
      next: () => {
        this.toast.success(`Sales ${!evt.isSalesOpen ? 'opened' : 'closed'} for "${evt.title}".`);
        this.loadEvents();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Could not update status.')
    });
  }
}
