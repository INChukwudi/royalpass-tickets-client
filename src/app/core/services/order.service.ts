import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InitiateOrderRequest,
  InitiateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  OrderLookupDto, OrderSeatsResponse, TicketTransfer
} from '../models/order.models';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  initiateOrder(req: InitiateOrderRequest): Observable<InitiateOrderResponse> {
    return this.http.post<InitiateOrderResponse>(`${this.base}/orders/initiate`, req);
  }

  verifyPayment(req: VerifyPaymentRequest): Observable<VerifyPaymentResponse> {
    return this.http.post<VerifyPaymentResponse>(`${this.base}/payments/verify`, req);
  }

  lookupOrders(params: { email?: string; phone?: string; reference?: string }): Observable<ApiResponse<OrderLookupDto[]>> {
    let httpParams = new HttpParams();
    if (params.email)     httpParams = httpParams.set('email', params.email);
    if (params.phone)     httpParams = httpParams.set('phone', params.phone);
    if (params.reference) httpParams = httpParams.set('reference', params.reference);
    return this.http.get<ApiResponse<OrderLookupDto[]>>(`${this.base}/orders/lookup`, { params: httpParams });
  }

  getSeats(reference:string, token:string):Observable<OrderSeatsResponse> {
    return this.http.get<OrderSeatsResponse>(`${this.base}/orders/${encodeURIComponent(reference)}/seats`, { params:{token} });
  }

  saveSeats(reference:string, token:string, buyerEmail:string, selections:{ticketId:string;seatId:string}[]):Observable<OrderSeatsResponse> {
    return this.http.put<OrderSeatsResponse>(`${this.base}/orders/${encodeURIComponent(reference)}/seats`, { reference, token, buyerEmail, selections });
  }

  downloadTicketPdf(code: string): Observable<Blob> {
    return this.http.get(`${this.base}/tickets/${encodeURIComponent(code)}/pdf`, { responseType: 'blob' });
  }

  downloadOrderPdf(reference: string): Observable<Blob> {
    return this.http.get(`${this.base}/orders/${encodeURIComponent(reference)}/pdf`, { responseType: 'blob' });
  }

  resendTickets(reference: string): Observable<ApiResponse<never>> {
    return this.http.post<ApiResponse<never>>(
      `${this.base}/orders/${encodeURIComponent(reference)}/resend`,
      {}
    );
  }

  listTransfers(reference:string,token:string):Observable<TicketTransfer[]> {
    return this.http.get<TicketTransfer[]>(`${this.base}/orders/${encodeURIComponent(reference)}/transfers`,{params:{token}});
  }

  createTransfer(ticketId:string,managementToken:string,recipientName:string,recipientEmail:string):Observable<TicketTransfer> {
    return this.http.post<TicketTransfer>(`${this.base}/tickets/${encodeURIComponent(ticketId)}/transfers`,{managementToken,recipientName,recipientEmail});
  }

  cancelTransfer(id:string,managementToken:string):Observable<TicketTransfer> {
    return this.http.post<TicketTransfer>(`${this.base}/ticket-transfers/${encodeURIComponent(id)}/cancel`,{managementToken});
  }

  getTransfer(token:string):Observable<TicketTransfer> {
    return this.http.get<TicketTransfer>(`${this.base}/ticket-transfers/${encodeURIComponent(token)}`);
  }

  acceptTransfer(token:string,recipientEmail:string):Observable<TicketTransfer> {
    return this.http.post<TicketTransfer>(`${this.base}/ticket-transfers/${encodeURIComponent(token)}/accept`,{recipientEmail});
  }

  saveDownload(content: Blob, fileName: string): void {
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
