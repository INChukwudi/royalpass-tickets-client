import {Component,inject,OnInit,signal} from '@angular/core';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {AdminService} from '../../../../core/services/admin.service';
import {OrderSeatsResponse,SeatDto} from '../../../../core/models/order.models';
import {ToastService} from '../../../../core/services/toast.service';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {DatePipe, DecimalPipe} from '@angular/common';

@Component({selector:'app-admin-seat-allocation',standalone:true,imports:[RouterLink,MatIconModule,MatMenuModule,DatePipe,DecimalPipe],templateUrl:'./admin-seat-allocation.component.html',styleUrl:'./admin-seat-allocation.component.scss'})
export class AdminSeatAllocationComponent implements OnInit{
 private readonly route=inject(ActivatedRoute);private readonly admin=inject(AdminService);private readonly toast=inject(ToastService);
 readonly map=signal<OrderSeatsResponse|null>(null);readonly active=signal<string|null>(null);readonly saving=signal(false);reference='';
 readonly history=signal<{ticketCode:string;previousSeat:string|null;newSeat:string|null;changedBy:string;reason:string|null;changedAt:string}[]>([]);
 ngOnInit(){this.reference=this.route.snapshot.paramMap.get('reference')??'';this.load();}
 load(){this.admin.getOrderSeats(this.reference).subscribe({next:v=>{this.map.set(v);this.active.set(v.tickets[0]?.id??null);this.admin.seatHistory(v.eventId).subscribe(h=>this.history.set(h));},error:()=>this.toast.error('Could not load this booking.')});}
 isEligible(seat:SeatDto){const map=this.map(),ticket=map?.tickets.find(t=>t.id===this.active());return !!ticket&&seat.band.toLowerCase()===ticket.band.toLowerCase();}
 choose(seat:SeatDto){const map=this.map(),ticketId=this.active();if(!map||!ticketId||!this.isEligible(seat)||(seat.state!=='available'&&seat.ticketId!==ticketId))return;this.map.set({...map,tickets:map.tickets.map(t=>t.id===ticketId?{...t,seatId:seat.id,seatLabel:seat.label}:t),seats:map.seats.map(s=>s.ticketId===ticketId?{...s,state:'available',ticketId:null}:s.id===seat.id?{...s,state:'selected',ticketId}:s)});}
 save(){const map=this.map();if(!map||map.tickets.some(t=>!t.seatId)){this.toast.warning('Choose one seat for every ticket.');return;}this.saving.set(true);this.admin.saveOrderSeats(this.reference,map.tickets.map(t=>({ticketId:t.id,seatId:t.seatId!}))).subscribe({next:v=>{this.map.set(v);this.saving.set(false);this.toast.success('Seats updated.')},error:e=>{this.saving.set(false);this.toast.error(e?.error?.message??'Could not save seats.');this.load()}});}
 allocateOutstanding(){const map=this.map();if(!map)return;this.admin.allocateOutstanding(map.eventId).subscribe(r=>{this.toast.success(`${r.ticketsAllocated} outstanding ticket(s) allocated.`);this.load()});}
 downloadManifest(){const map=this.map();if(!map)return;this.admin.downloadSeatManifest(map.eventId).subscribe(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='GCC-seat-manifest.xlsx';a.click();URL.revokeObjectURL(url);});}
 downloadManifestPdf(){const map=this.map();if(!map)return;this.admin.downloadSeatManifestPdf(map.eventId).subscribe(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='GCC-seat-manifest.pdf';a.click();URL.revokeObjectURL(url);});}
 toggleLock(event:Event,seat:SeatDto){event.preventDefault();if(seat.state==='taken'||seat.state==='selected'||seat.state==='broken')return;const lock=seat.state!=='locked';const reason=lock?window.prompt(`Why should ${seat.label} be held?`,'Operational hold'):null;if(lock&&reason===null)return;this.admin.lockSeat(seat.id,lock,reason).subscribe({next:()=>{this.toast.success(lock?'Seat held.':'Seat released.');this.load()},error:e=>this.toast.error(e?.error?.message??'Could not update this seat.')});}
 resetLink(){if(!window.confirm('Invalidate the customer current seat-management link?'))return;this.admin.resetSeatLink(this.reference).subscribe(()=>this.toast.success('A new private seat-access token was generated. Resend the booking email to the customer.'));}
}
