export interface TicketTypeDto {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  maxPerBuyer: number;
  salesStartDate: string | null;
  salesEndDate: string | null;
  description: string | null;
  isVisible: boolean;
  sortOrder: number;
}

export interface EventSummaryDto {
  id: string;
  title: string;
  bannerUrl: string | null;
  eventDate: string;
  seatSelectionClosesAt: string | null;
  venue: string;
  isPublished: boolean;
  isSalesOpen: boolean;
  ticketTypesCount: number;
  totalCapacity: number;
  createdAt: string;
}

export interface EventDetailDto {
  id: string;
  title: string;
  bannerUrl: string | null;
  eventDate: string;
  seatSelectionClosesAt: string | null;
  venue: string;
  description: string;
  organizerContact: string;
  organizerEmail: string | null;
  organizerPhone: string | null;
  isPublished: boolean;
  isSalesOpen: boolean;
  createdAt: string;
  updatedAt: string;
  ticketTypes: TicketTypeDto[];
}

export interface ListEventsResponse {
  items: EventSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateEventRequest {
  title: string;
  eventDate: string;
  seatSelectionClosesAt?: string | null;
  venue: string;
  description: string;
  organizerContact: string;
  organizerEmail?: string;
  organizerPhone?: string;
  isPublished: boolean;
}

export interface UpdateEventRequest extends CreateEventRequest {
  isPublished: boolean;
}

export interface CreateTicketTypeRequest {
  name: string;
  price: number;
  totalQuantity: number;
  maxPerBuyer: number;
  salesStartDate?: string | null;
  salesEndDate?: string | null;
  description?: string | null;
  isVisible: boolean;
  sortOrder: number;
}
