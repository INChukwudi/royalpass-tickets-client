import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { TicketTransfer } from '../../../core/models/order.models';

@Component({
  selector: 'app-ticket-transfer', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './ticket-transfer.component.html',
  styleUrl: './ticket-transfer.component.scss'
})
export class TicketTransferComponent implements OnInit {
  private readonly route=inject(ActivatedRoute); private readonly orders=inject(OrderService);
  readonly loading=signal(true); readonly accepting=signal(false); readonly transfer=signal<TicketTransfer|null>(null);
  readonly error=signal<string|null>(null); recipientEmail=''; token='';
  ngOnInit():void { this.token=this.route.snapshot.paramMap.get('token')??''; this.orders.getTransfer(this.token).subscribe({
    next:value=>{this.transfer.set(value);this.loading.set(false);},
    error:error=>{this.error.set(error?.error?.message??'This transfer invitation could not be loaded.');this.loading.set(false);}
  }); }
  accept():void { if(!this.recipientEmail.trim()){this.error.set('Enter the email address that received this invitation.');return;}
    this.accepting.set(true);this.error.set(null);this.orders.acceptTransfer(this.token,this.recipientEmail.trim()).subscribe({
      next:value=>{this.transfer.set(value);this.accepting.set(false);},
      error:error=>{this.error.set(error?.error?.message??'The transfer could not be accepted.');this.accepting.set(false);}
    });
  }
}
