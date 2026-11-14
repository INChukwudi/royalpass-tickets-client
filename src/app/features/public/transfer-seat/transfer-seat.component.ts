import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { SeatDto, TransferSeatResponse } from '../../../core/models/order.models';
import { ToastService } from '../../../core/services/toast.service';
import { publicErrorMessage } from '../../../core/utils/public-error-message';

@Component({selector:'app-transfer-seat',standalone:true,imports:[CommonModule,RouterLink,MatProgressSpinnerModule],templateUrl:'./transfer-seat.component.html',styleUrl:'./transfer-seat.component.scss'})
export class TransferSeatComponent implements OnInit {
  private readonly route=inject(ActivatedRoute);private readonly orders=inject(OrderService);private readonly toast=inject(ToastService);
  readonly loading=signal(true);readonly saving=signal(false);readonly map=signal<TransferSeatResponse|null>(null);readonly error=signal<string|null>(null);
  token='';readonly selectedSeatId=signal<string|null>(null);
  ngOnInit():void{this.token=this.route.snapshot.paramMap.get('token')??'';this.load();}
  load():void{this.loading.set(true);this.orders.getTransferSeat(this.token).subscribe({next:value=>{this.map.set(value);this.selectedSeatId.set(value.ticket.seatId);this.loading.set(false);},error:error=>{this.error.set(publicErrorMessage(error,'This seat-selection link could not be loaded.'));this.loading.set(false);}});}
  isEligible(seat:SeatDto):boolean{return !!this.map()&&this.map()!.ticket.band.toLowerCase()===seat.band.toLowerCase();}
  select(seat:SeatDto):void{const map=this.map();if(!map||!map.canCustomerChange||!this.isEligible(seat)||(seat.state!=='available'&&seat.ticketId!==map.ticket.id))return;this.selectedSeatId.set(seat.id);}
  state(seat:SeatDto):string{return seat.id===this.selectedSeatId()?'selected':seat.ticketId===this.map()?.ticket.id?'available':seat.state;}
  save():void{const map=this.map(),seatId=this.selectedSeatId();if(!map||!seatId){this.toast.warning('Choose a seat before saving.');return;}this.saving.set(true);this.orders.saveTransferSeat(this.token,map.ticket.id,seatId).subscribe({next:value=>{this.map.set(value);this.selectedSeatId.set(value.ticket.seatId);this.saving.set(false);this.toast.success('Your seat has been saved. An updated ticket is being emailed to you.');},error:error=>{this.saving.set(false);this.toast.error(publicErrorMessage(error,'We could not save your seat. Please try again.'));this.load();}});}
}
