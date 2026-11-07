import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminTicket } from '../../../../core/models/admin.models';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { TicketTransfer } from '../../../../core/models/order.models';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, DatePipe, RouterLink],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent implements OnInit {
  private readonly admin=inject(AdminService); private readonly toast=inject(ToastService);
  readonly items=signal<AdminTicket[]>([]);readonly total=signal(0);readonly loading=signal(false);readonly acting=signal<string|null>(null);
  readonly selected=signal<AdminTicket|null>(null);
  readonly transfers=signal<TicketTransfer[]>([]);
  search='';status='';hasSeat='';page=1;readonly pageSize=25;
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.admin.tickets(this.page,this.pageSize,this.search.trim(),this.status,this.hasSeat).subscribe({next:r=>{this.items.set(r.items);this.total.set(r.total);this.loading.set(false);},error:()=>this.loading.set(false)});}
  apply(){this.page=1;this.load();} move(d:number){this.page+=d;this.load();} get lastPage(){return Math.max(1,Math.ceil(this.total()/this.pageSize));}
  ticketPdfUrl(code:string){return `${environment.apiUrl}/tickets/${encodeURIComponent(code)}/pdf`;}
  select(ticket:AdminTicket){this.selected.set(ticket);this.transfers.set([]);this.admin.ticketTransfers(ticket.id).subscribe({next:value=>this.transfers.set(value)});}
  action(ticket:AdminTicket,action:'cancel'|'complimentary'|'checkin'|'reverse-checkin'|'resend'){
    if(action==='cancel'&&!window.confirm(`Cancel ticket ${ticket.code}?`))return;
    this.acting.set(ticket.id);this.admin.ticketAction(ticket.id,action).subscribe({next:r=>{this.toast.success(r.message??'Ticket updated.');this.acting.set(null);this.load();},error:e=>{this.toast.error(e?.error?.message??'Action failed.');this.acting.set(null);}});
  }
}
