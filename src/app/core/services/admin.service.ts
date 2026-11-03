import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AdminOrder, AdminPermission, AdminTicket, AdminUser, CheckInSearchResult, CreateManualOrderRequest, CreateManualOrderResponse, DashboardData, PagedResponse, SaveAdminUserRequest, ScanResult } from '../models/admin.models';
import { OrderSeatsResponse } from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;
  orders(page:number, pageSize:number, search:string, paymentStatus:string):Observable<PagedResponse<AdminOrder>> {
    let p=new HttpParams().set('page',page).set('pageSize',pageSize);
    if(search) p=p.set('search',search); if(paymentStatus) p=p.set('paymentStatus',paymentStatus);
    return this.http.get<PagedResponse<AdminOrder>>(`${this.base}/orders`,{params:p});
  }
  createManualOrder(request:CreateManualOrderRequest):Observable<CreateManualOrderResponse> {
    return this.http.post<CreateManualOrderResponse>(`${this.base}/orders/manual`,request);
  }
  getOrderSeats(reference:string):Observable<OrderSeatsResponse>{return this.http.get<OrderSeatsResponse>(`${this.base}/orders/${encodeURIComponent(reference)}/seats`);}
  saveOrderSeats(reference:string,selections:{ticketId:string;seatId:string}[]):Observable<OrderSeatsResponse>{return this.http.put<OrderSeatsResponse>(`${this.base}/orders/${encodeURIComponent(reference)}/seats`,{reference,selections});}
  allocateOutstanding(eventId:string):Observable<{ordersProcessed:number;ticketsAllocated:number}>{return this.http.post<{ordersProcessed:number;ticketsAllocated:number}>(`${this.base}/events/${eventId}/seats/allocate-outstanding`,{eventId});}
  downloadSeatManifest(eventId:string):Observable<Blob>{return this.http.get(`${this.base}/events/${eventId}/seats/manifest.xlsx`,{responseType:'blob'});}
  downloadSeatManifestPdf(eventId:string):Observable<Blob>{return this.http.get(`${this.base}/events/${eventId}/seats/manifest.pdf`,{responseType:'blob'});}
  lockSeat(seatId:string,locked:boolean,reason:string|null):Observable<void>{return this.http.put<void>(`${this.base}/seats/${seatId}/lock`,{seatId,locked,reason});}
  seatHistory(eventId:string):Observable<{ticketCode:string;previousSeat:string|null;newSeat:string|null;changedBy:string;reason:string|null;changedAt:string}[]>{return this.http.get<any[]>(`${this.base}/events/${eventId}/seats/history`);}
  resetSeatLink(reference:string):Observable<{token:string}>{return this.http.post<{token:string}>(`${this.base}/orders/${encodeURIComponent(reference)}/seats/reset-link`,{reference});}
  tickets(page:number,pageSize:number,search:string,status:string,hasSeat:string=''):Observable<PagedResponse<AdminTicket>> {
    let p=new HttpParams().set('page',page).set('pageSize',pageSize);
    if(search) p=p.set('search',search); if(status) p=p.set('status',status); if(hasSeat) p=p.set('hasSeat',hasSeat);
    return this.http.get<PagedResponse<AdminTicket>>(`${this.base}/tickets`,{params:p});
  }
  ticketAction(id:string,action:'cancel'|'complimentary'|'checkin'|'reverse-checkin'|'resend'):Observable<ApiResponse<never>> {
    return action==='resend'
      ? this.http.post<ApiResponse<never>>(`${this.base}/tickets/${id}/resend`,{})
      : this.http.patch<ApiResponse<never>>(`${this.base}/tickets/${id}/${action}`,{});
  }
  scan(code:string):Observable<ScanResult>{return this.http.post<ScanResult>(`${environment.apiUrl}/checkin/scan`,{code});}
  checkInSearch(query:string):Observable<CheckInSearchResult[]>{return this.http.get<CheckInSearchResult[]>(`${environment.apiUrl}/checkin/search`,{params:{query}});}
  dashboard():Observable<DashboardData>{return this.http.get<DashboardData>(`${this.base}/dashboard`);}
  report(type:string):Observable<Blob>{return this.http.get(`${this.base}/reports/${type}`,{responseType:'blob'});}
  users():Observable<AdminUser[]>{return this.http.get<AdminUser[]>(`${this.base}/users`);}
  permissions():Observable<AdminPermission[]>{return this.http.get<AdminPermission[]>(`${this.base}/users/permissions`);}
  createUser(request:SaveAdminUserRequest):Observable<AdminUser>{return this.http.post<AdminUser>(`${this.base}/users`,request);}
  updateUser(id:string,request:SaveAdminUserRequest):Observable<AdminUser>{return this.http.put<AdminUser>(`${this.base}/users/${id}`,request);}
}
