import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateEventRequest,
  CreateTicketTypeRequest,
  EventDetailDto,
  ListEventsResponse,
  TicketTypeDto,
  UpdateEventRequest,
} from '../models/event.models';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/events`;

  listEvents(page = 1, pageSize = 20, published?: boolean): Observable<ListEventsResponse> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (published !== undefined) params = params.set('published', published);
    return this.http.get<ListEventsResponse>(this.base, { params }).pipe(
      map(response => ({
        ...response,
        items: response.items.map(event => ({ ...event, bannerUrl: this.assetUrl(event.bannerUrl) }))
      }))
    );
  }

  getEvent(id: string): Observable<EventDetailDto> {
    return this.http.get<EventDetailDto>(`${this.base}/${id}`).pipe(
      map(event => ({ ...event, bannerUrl: this.assetUrl(event.bannerUrl) }))
    );
  }

  createEvent(payload: CreateEventRequest): Observable<{ id: string; title: string }> {
    return this.http.post<{ id: string; title: string }>(this.base, payload);
  }

  updateEvent(id: string, payload: UpdateEventRequest): Observable<EventDetailDto> {
    return this.http.put<EventDetailDto>(`${this.base}/${id}`, payload);
  }

  setStatus(id: string, isSalesOpen: boolean): Observable<unknown> {
    return this.http.patch(`${this.base}/${id}/status`, { isSalesOpen });
  }

  uploadBanner(id: string, file: File): Observable<{ bannerUrl: string }> {
    const form = new FormData();
    form.append('banner', file);
    return this.http.post<{ bannerUrl: string }>(`${this.base}/${id}/banner`, form);
  }

  // Ticket types
  createTicketType(eventId: string, payload: CreateTicketTypeRequest): Observable<TicketTypeDto> {
    return this.http.post<TicketTypeDto>(`${this.base}/${eventId}/ticket-types`, payload);
  }

  updateTicketType(id: string, payload: CreateTicketTypeRequest): Observable<TicketTypeDto> {
    return this.http.put<TicketTypeDto>(`${environment.apiUrl}/ticket-types/${id}`, payload);
  }

  deleteTicketType(id: string): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/ticket-types/${id}`);
  }

  assetUrl(path: string | null): string | null {
    if (!path || /^https?:\/\//i.test(path)) return path;
    if (!environment.apiUrl.startsWith('http')) return path;
    return new URL(path, environment.apiUrl).toString();
  }
}
