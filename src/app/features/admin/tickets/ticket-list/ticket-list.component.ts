import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminTicket, TicketCategoryDetails } from '../../../../core/models/admin.models';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { TicketTransfer } from '../../../../core/models/order.models';
import { AuthService } from '../../../../core/services/auth.service';
import { ADMIN_PERMISSIONS } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, DatePipe, RouterLink],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent implements OnInit {
  private readonly admin=inject(AdminService); private readonly toast=inject(ToastService);private readonly auth=inject(AuthService);
  readonly canManageSeats=this.auth.hasPermission(ADMIN_PERMISSIONS.manageSeats);
  readonly canManageTickets=this.auth.hasPermission(ADMIN_PERMISSIONS.manageTickets);
  readonly canCheckIn=this.auth.hasPermission(ADMIN_PERMISSIONS.checkInTickets);
  readonly items=signal<AdminTicket[]>([]);readonly total=signal(0);readonly loading=signal(false);readonly acting=signal<string|null>(null);
  readonly selected=signal<AdminTicket|null>(null);
  readonly transfers=signal<TicketTransfer[]>([]);
  readonly transferOpen=signal(false);readonly transferring=signal(false);
  readonly categoryOpen=signal(false);readonly categoryLoading=signal(false);readonly categorySaving=signal(false);
  readonly categoryDetails=signal<TicketCategoryDetails|null>(null);
  recipientName='';recipientEmail='';
  categoryTicketTypeId='';categoryReason='';
  search='';status='';hasSeat='';page=1;readonly pageSize=25;
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.admin.tickets(this.page,this.pageSize,this.search.trim(),this.status,this.hasSeat).subscribe({next:r=>{this.items.set(r.items);this.total.set(r.total);this.loading.set(false);},error:()=>this.loading.set(false)});}
  apply(){this.page=1;this.load();} move(d:number){this.page+=d;this.load();} get lastPage(){return Math.max(1,Math.ceil(this.total()/this.pageSize));}
  ticketPdfUrl(code:string){return `${environment.apiUrl}/tickets/${encodeURIComponent(code)}/pdf`;}
  select(ticket:AdminTicket){this.selected.set(ticket);this.transfers.set([]);this.admin.ticketTransfers(ticket.id).subscribe({next:value=>this.transfers.set(value)});}
  openTransfer(ticket:AdminTicket){this.select(ticket);this.recipientName='';this.recipientEmail='';this.transferOpen.set(true);}
  closeTransfer(){if(!this.transferring())this.transferOpen.set(false);}
  closeDrawer(){if(this.transferring()||this.categorySaving())return;this.selected.set(null);this.transferOpen.set(false);this.categoryOpen.set(false);}
  openCategory(ticket:AdminTicket){
    this.select(ticket);this.transferOpen.set(false);this.categoryOpen.set(true);this.categoryLoading.set(true);this.categoryDetails.set(null);this.categoryTicketTypeId='';this.categoryReason='';
    this.admin.ticketCategory(ticket.id).subscribe({next:value=>{this.categoryDetails.set(value);this.categoryLoading.set(false);},error:e=>{this.categoryLoading.set(false);this.categoryOpen.set(false);this.toast.error(e?.error?.message??'Could not load ticket categories.');}});
  }
  changeCategory(ticket:AdminTicket){
    const details=this.categoryDetails(),reason=this.categoryReason.trim(),target=details?.options.find(x=>x.id===this.categoryTicketTypeId);
    if(!target||!target.canMoveTo){this.toast.error('Choose an available destination category.');return;}
    if(reason.length<3){this.toast.error('Enter a short reason for the audit trail.');return;}
    const seatWarning=details?.currentSeat?` Seat ${details.currentSeat} will immediately become available.`:'';
    if(!window.confirm(`Move ${ticket.buyerName} from ${details?.currentCategory} to ${target.name}?${seatWarning} The existing QR will be replaced and an email will be sent.`))return;
    this.categorySaving.set(true);
    this.admin.changeTicketCategory(ticket.id,target.id,reason).subscribe({next:value=>{this.categorySaving.set(false);this.toast.success(value.message);this.categoryOpen.set(false);this.categoryDetails.set(null);this.selected.set(null);this.load();},error:e=>{this.categorySaving.set(false);this.toast.error(e?.error?.message??'Could not change the ticket category.');}});
  }
  createTransfer(ticket:AdminTicket){
    const name=this.recipientName.trim(),email=this.recipientEmail.trim();
    if(!name||!email){this.toast.error('Enter the recipient name and email address.');return;}
    if(!window.confirm(`Send a transfer invitation for ${ticket.code} to ${name} (${email})?`))return;
    this.transferring.set(true);
    this.admin.createTicketTransfer(ticket.id,name,email).subscribe({next:value=>{this.transfers.update(items=>[value,...items]);this.transferOpen.set(false);this.transferring.set(false);this.toast.success('Transfer started. Both ticket holders have been notified.');},error:e=>{this.toast.error(e?.error?.message??'Could not start the transfer.');this.transferring.set(false);}});
  }
  cancelTransfer(item:TicketTransfer){
    if(!window.confirm(`Cancel the pending transfer to ${item.recipientName}?`))return;
    this.admin.cancelTicketTransfer(item.id).subscribe({next:value=>{this.transfers.update(items=>items.map(x=>x.id===value.id?value:x));this.toast.success('Transfer cancelled. A new transfer can now be initiated.');},error:e=>this.toast.error(e?.error?.message??'Could not cancel the transfer.')});
  }
  action(ticket:AdminTicket,action:'cancel'|'reactivate'|'complimentary'|'checkin'|'reverse-checkin'|'resend'){
    if(action==='cancel'&&!window.confirm(`Cancel ticket ${ticket.code}?`))return;
    if(action==='reactivate'&&!window.confirm(`Reactivate ticket ${ticket.code}? Its previous seat will not be restored.`))return;
    this.acting.set(ticket.id);this.admin.ticketAction(ticket.id,action).subscribe({next:r=>{this.toast.success(r.message??'Ticket updated.');this.acting.set(null);this.load();},error:e=>{this.toast.error(e?.error?.message??'Action failed.');this.acting.set(null);}});
  }
}
