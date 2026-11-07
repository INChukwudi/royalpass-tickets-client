import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { EmailDelivery } from '../../../core/models/admin.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({selector:'app-email-deliveries',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./email-deliveries.component.html',styleUrl:'./email-deliveries.component.scss'})
export class EmailDeliveriesComponent implements OnInit{
  private readonly admin=inject(AdminService);private readonly toast=inject(ToastService);
  readonly items=signal<EmailDelivery[]>([]);readonly loading=signal(true);status='';
  ngOnInit():void{this.load();}
  load():void{this.loading.set(true);this.admin.emailDeliveries(this.status||undefined).subscribe({next:r=>{this.items.set(r.items);this.loading.set(false);},error:()=>{this.loading.set(false);this.toast.error('Could not load email deliveries.');}});}
  retry(item:EmailDelivery):void{this.admin.retryEmailDelivery(item.id).subscribe({next:()=>{this.toast.success('Email retry queued.');this.load();},error:e=>this.toast.error(e?.error?.message??'Could not queue retry.')});}
}
