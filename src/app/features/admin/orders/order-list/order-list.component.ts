import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminOrder } from '../../../../core/models/admin.models';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent implements OnInit {
  private readonly admin = inject(AdminService);
  readonly items=signal<AdminOrder[]>([]); readonly total=signal(0); readonly loading=signal(false);
  search=''; status=''; page=1; readonly pageSize=25;
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.admin.orders(this.page,this.pageSize,this.search.trim(),this.status).subscribe({next:r=>{this.items.set(r.items);this.total.set(r.total);this.loading.set(false);},error:()=>this.loading.set(false)});}
  apply(){this.page=1;this.load();}
  move(delta:number){this.page+=delta;this.load();}
  get lastPage(){return Math.max(1,Math.ceil(this.total()/this.pageSize));}
}
