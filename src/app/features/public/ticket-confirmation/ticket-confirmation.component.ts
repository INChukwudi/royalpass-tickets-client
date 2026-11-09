import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { OrderSeatsResponse, SeatDto, TicketTransfer, VerifyPaymentResponse } from '../../../core/models/order.models';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { publicErrorMessage } from '../../../core/utils/public-error-message';

@Component({
  selector: 'app-ticket-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './ticket-confirmation.component.html',
  styleUrl: './ticket-confirmation.component.scss'
})
export class TicketConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  isLoading = signal(true);
  isSuccess = signal(false);
  result = signal<VerifyPaymentResponse | null>(null);
  error = signal<string | null>(null);
  seats = signal<OrderSeatsResponse | null>(null);
  activeTicketId = signal<string | null>(null);
  savingSeats = signal(false);
  transfers = signal<TicketTransfer[]>([]);
  transferTicketId = signal<string|null>(null);
  transferring = signal(false);
  recipientName=''; recipientEmail=''; managementToken='';
  apiBase = environment.apiUrl.replace('/api', '');

  ngOnInit(): void {
    const ref = this.route.snapshot.queryParamMap.get('reference')
              ?? this.route.snapshot.paramMap.get('reference');
    this.managementToken=this.route.snapshot.queryParamMap.get('token')??'';

    if (!ref) {
      this.error.set('No payment reference found.');
      this.isLoading.set(false);
      return;
    }

    this.orderService.verifyPayment({ reference: ref }).subscribe({
      next: res => {
        this.result.set(res);
        this.isSuccess.set(res.status === 'success');
        this.isLoading.set(false);
        if (res.status === 'success') { this.managementToken ||= res.seatAccessToken; this.loadSeats(res); this.loadTransfers(res.reference); }
      },
      error: err => {
        this.error.set(publicErrorMessage(err, 'Could not verify your payment. Please contact support with your reference.'));
        this.isLoading.set(false);
      }
    });
  }

  startTransfer(ticketId:string):void { this.transferTicketId.set(ticketId);this.recipientName='';this.recipientEmail=''; }
  submitTransfer():void {
    const ticketId=this.transferTicketId();if(!ticketId||!this.recipientName.trim()||!this.recipientEmail.trim()){this.toast.warning('Enter the recipient name and email.');return;}
    this.transferring.set(true);this.orderService.createTransfer(ticketId,this.managementToken,this.recipientName.trim(),this.recipientEmail.trim()).subscribe({
      next:value=>{this.transfers.update(items=>[value,...items]);this.transferTicketId.set(null);this.transferring.set(false);this.toast.success('Transfer invitation queued. The ticket remains unchanged until the recipient accepts it.');},
      error:error=>{this.transferring.set(false);this.toast.error(publicErrorMessage(error,'Ticket transfer is temporarily unavailable. Please try again later or contact support.'));}
    });
  }
  cancelTransfer(item:TicketTransfer):void { this.orderService.cancelTransfer(item.id,this.managementToken).subscribe({next:value=>{this.transfers.update(items=>items.map(x=>x.id===value.id?value:x));this.toast.success('Transfer cancelled.');},error:error=>this.toast.error(publicErrorMessage(error,'Could not cancel the transfer. Please try again.'))}); }
  pendingTransfer(ticketId:string):TicketTransfer|undefined { return this.transfers().find(x=>x.ticketId===ticketId&&x.status==='Pending'); }
  private loadTransfers(reference:string):void { if(!this.managementToken)return;this.orderService.listTransfers(reference,this.managementToken).subscribe({next:value=>this.transfers.set(value)}); }

  selectSeat(seat:SeatDto):void {
    const map=this.seats(); const ticketId=this.activeTicketId();
    if(!map || !ticketId || !this.isEligible(seat) || (seat.state!=='available' && seat.ticketId!==ticketId)) return;
    const tickets=map.tickets.map(ticket=>ticket.id===ticketId
      ? {...ticket,seatId:seat.id,seatLabel:seat.label}:ticket);
    const seats=map.seats.map(item=>item.ticketId===ticketId
      ? {...item,state:'available',ticketId:null}:item.id===seat.id
        ? {...item,state:'selected',ticketId}:item);
    this.seats.set({...map,tickets,seats});
    const next=tickets.find(ticket=>!ticket.seatId);
    if(next) this.activeTicketId.set(next.id);
  }

  isEligible(seat:SeatDto):boolean {
    const ticket=this.seats()?.tickets.find(item=>item.id===this.activeTicketId());
    return !!ticket&&ticket.band.toLowerCase()===seat.band.toLowerCase();
  }

  chooseSeat(ticketId:string,seatId:string):void { const seat=this.seats()?.seats.find(x=>x.id===seatId);if(seat){this.activeTicketId.set(ticketId);this.selectSeat(seat);} }

  findSeatsTogether():void {
    const map=this.seats();if(!map)return;const count=map.tickets.length;
    const available=map.seats.filter(s=>(s.state==='available'||s.state==='selected')&&this.isEligible(s)).sort((a,b)=>a.section.localeCompare(b.section)||a.row-b.row||a.number-b.number);
    for(let i=0;i<=available.length-count;i++){const run=available.slice(i,i+count);if(run.every((s,j)=>s.section===run[0].section&&s.row===run[0].row&&(j===0||s.number===run[j-1].number+1))){
      let updated=map;run.forEach((seat,j)=>{this.seats.set(updated);this.activeTicketId.set(updated.tickets[j].id);this.selectSeat(seat);updated=this.seats()!;});this.toast.success('Found adjacent seats for your group.');return;
    }}this.toast.warning('No adjacent group is currently available. Your existing seats are unchanged.');
  }

  saveSeatChanges():void {
    const map=this.seats(); const result=this.result();
    if(!map || !result || map.tickets.some(x=>!x.seatId)) { this.toast.warning('Choose a seat for every ticket.'); return; }
    this.savingSeats.set(true);
    this.orderService.saveSeats(result.reference,result.seatAccessToken,result.buyerEmail,map.tickets.map(x=>({ticketId:x.id,seatId:x.seatId!}))).subscribe({
      next:value=>{this.seats.set(value);this.savingSeats.set(false);this.toast.success('Your seats have been updated. Download the refreshed tickets.');},
      error:error=>{this.savingSeats.set(false);this.toast.error(publicErrorMessage(error,'We could not update your seats. Please try again.'));this.loadSeats(result);}
    });
  }

  private loadSeats(result:VerifyPaymentResponse):void {
    this.orderService.getSeats(result.reference,result.seatAccessToken).subscribe({next:value=>{
      this.seats.set(value);this.activeTicketId.set(value.tickets[0]?.id??null);
    }});
  }

  qrUrl(path: string): string {
    return `${this.apiBase}${path}`;
  }

  downloadTicket(code: string): void {
    const ticket = this.result()?.tickets.find(item => item.ticketCode === code);
    if (!ticket) return;
    this.orderService.downloadTicketPdf(ticket.downloadUrl).subscribe({
      next: pdf => this.orderService.saveDownload(pdf, `${code}.pdf`),
      error: () => this.toast.error('Could not download this ticket.')
    });
  }

  downloadOrder(): void {
    const reference = this.result()?.reference;
    if (!reference) return;
    this.orderService.downloadOrderPdf(reference, this.result()!.seatAccessToken).subscribe({
      next: pdf => this.orderService.saveDownload(pdf, `RoyalPass-${reference}.pdf`),
      error: () => this.toast.error('Could not download your tickets.')
    });
  }
}
