export interface InitiateOrderRequest {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  callbackUrl: string;
  referralCode?: string | null;
}

export interface InitiateOrderResponse {
  orderId: string;
  reference: string;
  paymentUrl: string;
  accessCode: string;
  totalAmount: number;
}

export interface VerifyPaymentRequest {
  reference: string;
}

export interface TicketSummary {
  ticketId: string;
  ticketCode: string;
  ticketTypeName: string;
  qrCodeUrl: string;
  seatLabel: string | null;
  holderName: string;
  holderEmail: string;
}

export interface TicketTransfer {
  id:string; ticketId:string; ticketCode:string; eventTitle:string; eventDate:string;
  currentHolderName:string; recipientName:string; recipientEmail:string; status:string;
  expiresAt:string; acceptedAt:string|null;
}

export interface VerifyPaymentResponse {
  status: string;
  reference: string;
  orderId: string;
  tickets: TicketSummary[];
  seatAccessToken: string;
  buyerEmail: string;
}

export interface SeatDto { id:string; label:string; section:string; row:number; number:number; x:number; y:number; band:string; state:string; ticketId:string|null; }
export interface SeatTicketDto { id:string; code:string; band:string; seatId:string|null; seatLabel:string|null; }
export interface SeatBandSummary { band:string;total:number;available:number;assigned:number;locked:number; }
export interface OrderSeatsResponse { orderId:string;eventId:string; reference:string; eventTitle:string;seatSelectionClosesAt:string;canCustomerChange:boolean;tickets:SeatTicketDto[];seats:SeatDto[];summary:SeatBandSummary[]; }

export interface OrderTicketDto {
  ticketId: string;
  ticketCode: string;
  ticketTypeName: string;
  status: string;
  qrCodeUrl: string;
  seatLabel: string | null;
}

export interface OrderLookupDto {
  orderId: string;
  reference: string;
  eventTitle: string;
  eventVenue: string;
  eventDate: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: string;
  paidAt: string | null;
  tickets: OrderTicketDto[];
}
