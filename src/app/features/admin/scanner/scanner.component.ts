import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { AdminService } from '../../../core/services/admin.service';
import { CheckInSearchResult, ScanResult } from '../../../core/models/admin.models';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ZXingScannerModule],
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss'
})
export class ScannerComponent {
  private readonly admin=inject(AdminService);
  cameraEnabled=true; code=''; query=''; readonly processing=signal(false); readonly result=signal<ScanResult|null>(null); readonly matches=signal<CheckInSearchResult[]>([]);
  scanSuccess(value:string){if(!this.processing())this.submit(value);}
  submit(value=this.code){if(!value.trim())return;this.processing.set(true);this.admin.scan(value.trim()).subscribe({next:r=>{this.result.set(r);this.processing.set(false);this.code='';},error:e=>{this.result.set({admitted:false,decision:'rejected',message:e?.error?.message??'Scan failed.',ticketId:null,ticketCode:value,guestName:null,eventTitle:null,ticketType:null,checkedInAt:null,seatLabel:null});this.processing.set(false);}});}
  search(){if(!this.query.trim())return;this.admin.checkInSearch(this.query.trim()).subscribe(r=>this.matches.set(r));}
  admit(ticket:CheckInSearchResult){this.submit(ticket.ticketCode);}
}
