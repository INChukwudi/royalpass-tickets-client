import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent {
  private readonly admin=inject(AdminService);readonly loading=signal<string|null>(null);
  readonly reports=[['attendees','Attendees'],['orders','Orders'],['checkins','Check-ins'],['noshows','No-shows'],['complimentary','Complimentary'],['sales-summary','Sales summary']];
  download(type:string){this.loading.set(type);this.admin.report(type).subscribe({next:blob=>{const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`${type}.xlsx`;a.click();URL.revokeObjectURL(u);this.loading.set(null);},error:()=>this.loading.set(null)});}
}
