import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InitiateOrderRequest,
  InitiateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  OrderLookupDto, OrderSeatsResponse, TicketTransfer, TransferSeatResponse
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

  lookupOrders(reference: string, email: string): Observable<ApiResponse<OrderLookupDto[]>> {
    const httpParams = new HttpParams().set('reference', reference).set('email', email);
    return this.http.get<ApiResponse<OrderLookupDto[]>>(`${this.base}/orders/lookup`, { params: httpParams });
  }

  getSeats(reference:string, token:string):Observable<OrderSeatsResponse> {
    return this.http.get<OrderSeatsResponse>(`${this.base}/orders/${encodeURIComponent(reference)}/seats`, { params:{token} });
  }

  saveSeats(reference:string, token:string, buyerEmail:string, selections:{ticketId:string;seatId:string}[]):Observable<OrderSeatsResponse> {
    return this.http.put<OrderSeatsResponse>(`${this.base}/orders/${encodeURIComponent(reference)}/seats`, { reference, token, buyerEmail, selections });
  }

  downloadTicketPdf(downloadUrl: string): Observable<Blob> {
    return this.http.get(this.absoluteApiUrl(downloadUrl), { responseType: 'blob' });
  }

  downloadOrderPdf(reference: string, token: string): Observable<Blob> {
    return this.http.get(`${this.base}/orders/${encodeURIComponent(reference)}/pdf`, { params:{token}, responseType: 'blob' });
  }

  resendTickets(reference: string, email: string): Observable<ApiResponse<never>> {
    return this.http.post<ApiResponse<never>>(
      `${this.base}/orders/${encodeURIComponent(reference)}/resend`,
      { email }
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

  getTransferSeat(token:string):Observable<TransferSeatResponse> {
    return this.http.get<TransferSeatResponse>(`${this.base}/ticket-transfers/${encodeURIComponent(token)}/seats`);
  }

  saveTransferSeat(token:string,ticketId:string,seatId:string):Observable<TransferSeatResponse> {
    return this.http.put<TransferSeatResponse>(`${this.base}/ticket-transfers/${encodeURIComponent(token)}/seats`,{selections:[{ticketId,seatId}]});
  }

  saveDownload(content: Blob, fileName: string): void {
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private absoluteApiUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const origin = this.base.replace(/\/api\/?$/, '');
    return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
