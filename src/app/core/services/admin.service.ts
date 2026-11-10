import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AdminOrder, AdminPermission, AdminTicket, AdminUser, CheckInSearchResult, CreateManualOrderRequest, CreateManualOrderResponse, DashboardData, EmailDeliveryPage, OrganizationPaymentSettings, PagedResponse, ReferralCode, ReferralUsageReport, SaveAdminUserRequest, SaveOrganizationPaymentSettingsRequest, ScanResult, SeatOverview, SeatOverviewEvent } from '../models/admin.models';
import { OrderSeatsResponse, TicketTransfer } from '../models/order.models';

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
  seatOverviewEvents():Observable<SeatOverviewEvent[]>{return this.http.get<SeatOverviewEvent[]>(`${this.base}/seats/events`);}
  seatOverview(eventId:string):Observable<SeatOverview>{return this.http.get<SeatOverview>(`${this.base}/events/${eventId}/seats/overview`);}
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
  report(type:string,eventId?:string):Observable<Blob>{return this.http.get(`${this.base}/reports/${type}`,{params:eventId?{eventId}:{},responseType:'blob'});}
  users():Observable<AdminUser[]>{return this.http.get<AdminUser[]>(`${this.base}/users`);}
  permissions():Observable<AdminPermission[]>{return this.http.get<AdminPermission[]>(`${this.base}/users/permissions`);}
  createUser(request:SaveAdminUserRequest):Observable<AdminUser>{return this.http.post<AdminUser>(`${this.base}/users`,request);}
  updateUser(id:string,request:SaveAdminUserRequest):Observable<AdminUser>{return this.http.put<AdminUser>(`${this.base}/users/${id}`,request);}
  organizationPaymentSettings():Observable<OrganizationPaymentSettings>{return this.http.get<OrganizationPaymentSettings>(`${this.base}/organization/payment-settings`);}
  saveOrganizationPaymentSettings(request:SaveOrganizationPaymentSettingsRequest):Observable<OrganizationPaymentSettings>{return this.http.put<OrganizationPaymentSettings>(`${this.base}/organization/payment-settings`,request);}
  emailDeliveries(page:number,pageSize:number,status:string,search:string):Observable<EmailDeliveryPage>{
    let params=new HttpParams().set('page',page).set('pageSize',pageSize);
    if(status) params=params.set('status',status); if(search) params=params.set('search',search);
    return this.http.get<EmailDeliveryPage>(`${this.base}/email-deliveries`,{params});
  }
  retryEmailDelivery(id:string):Observable<ApiResponse<never>>{return this.http.post<ApiResponse<never>>(`${this.base}/email-deliveries/${id}/retry`,{});}
  ticketTransfers(id:string):Observable<TicketTransfer[]>{return this.http.get<TicketTransfer[]>(`${this.base}/tickets/${id}/transfers`);}
  createTicketTransfer(id:string,recipientName:string,recipientEmail:string):Observable<TicketTransfer>{return this.http.post<TicketTransfer>(`${this.base}/tickets/${id}/transfers`,{recipientName,recipientEmail});}
  eventReferralCodes(eventId:string):Observable<ReferralCode[]>{return this.http.get<ReferralCode[]>(`${this.base}/events/${eventId}/referral-codes`);}
  referralCodes():Observable<ReferralCode[]>{return this.http.get<ReferralCode[]>(`${this.base}/referral-codes`);}
  referralReport(eventId?:string):Observable<ReferralUsageReport>{return this.http.get<ReferralUsageReport>(`${this.base}/referral-codes/report`,{params:eventId?{eventId}:{}});}
  importReferralCodes(codes:{code:string;label:string|null}[]):Observable<{created:number;updated:number;codes:ReferralCode[]}>{return this.http.put<{created:number;updated:number;codes:ReferralCode[]}>(`${this.base}/referral-codes/import`,{codes});}
  setReferralCodeStatus(id:string,isActive:boolean):Observable<ReferralCode>{return this.http.patch<ReferralCode>(`${this.base}/referral-codes/${id}/status`,{id,isActive});}
}
