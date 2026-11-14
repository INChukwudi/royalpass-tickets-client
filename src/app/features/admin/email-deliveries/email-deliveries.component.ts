import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { EmailDelivery } from '../../../core/models/admin.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({selector:'app-email-deliveries',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./email-deliveries.component.html',styleUrl:'./email-deliveries.component.scss'})
export class EmailDeliveriesComponent implements OnInit{
  private readonly admin=inject(AdminService);private readonly toast=inject(ToastService);
  readonly items=signal<EmailDelivery[]>([]);readonly loading=signal(true);readonly total=signal(0);
  readonly resendingTransferAccess=signal(false);
  readonly pageSize=30;page=1;status='';search='';
  get lastPage():number{return Math.max(1,Math.ceil(this.total()/this.pageSize));}
  ngOnInit():void{this.load();}
  load():void{this.loading.set(true);this.admin.emailDeliveries(this.page,this.pageSize,this.status,this.search.trim()).subscribe({next:r=>{this.items.set(r.items);this.total.set(r.total);this.page=r.page;this.loading.set(false);},error:()=>{this.loading.set(false);this.toast.error('Could not load email deliveries.');}});}
  apply():void{this.page=1;this.load();}
  changeStatus():void{this.page=1;this.load();}
  move(delta:number):void{const next=this.page+delta;if(next<1||next>this.lastPage)return;this.page=next;this.load();}
  retry(item:EmailDelivery):void{this.admin.retryEmailDelivery(item.id).subscribe({next:()=>{this.toast.success('Email retry queued.');this.load();},error:e=>this.toast.error(e?.error?.message??'Could not queue retry.')});}
  resendTransferSeatAccess():void{if(!window.confirm('Send corrected seat-access emails to every accepted transfer whose seat window is still open? This operation is idempotent and will not resend twice.'))return;this.resendingTransferAccess.set(true);this.admin.resendTransferSeatAccess().subscribe({next:r=>{this.resendingTransferAccess.set(false);this.toast.success(`${r.queued} transfer seat-access email${r.queued===1?'':'s'} queued; ${r.alreadyQueued} already handled.`);this.load();},error:e=>{this.resendingTransferAccess.set(false);this.toast.error(e?.error?.message??'Could not queue transfer seat-access emails.');}});}
}
