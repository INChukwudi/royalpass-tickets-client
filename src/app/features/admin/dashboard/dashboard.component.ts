import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CurrencyPipe, DatePipe, DecimalPipe } from "@angular/common";
import { AuthService } from "../../../core/services/auth.service";
import { AdminService } from '../../../core/services/admin.service';
import { DashboardData } from '../../../core/models/admin.models';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe, BaseChartDirective],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss"
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  readonly data=signal<DashboardData|null>(null);
  readonly currentUser = this.authService.currentUser;
  readonly today = new Date();

  readonly firstName = computed(() => {
    const full = this.currentUser()?.fullName ?? "";
    return full.split(" ")[0];
  });

  readonly timeGreeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  });

  readonly stats=computed(()=>{const d=this.data();return [
    {label:'Total Revenue',value:d?.revenue??0,currency:true,icon:'payments',color:'#16a34a',bg:'rgba(22,163,74,.1)',trend:0},
    {label:'Tickets Sold',value:d?.ticketsSold??0,currency:false,icon:'confirmation_number',color:'#6366f1',bg:'rgba(99,102,241,.1)',trend:0},
    {label:'Checked In',value:d?.checkedIn??0,currency:false,icon:'how_to_reg',color:'#0891b2',bg:'rgba(8,145,178,.1)',trend:0},
    {label:'Seats Assigned',value:d?.seatsAssigned??0,currency:false,icon:'event_seat',color:'#16a34a',bg:'rgba(22,163,74,.1)',trend:0},
    {label:'Awaiting Seat',value:d?.awaitingSeat??0,currency:false,icon:'pending_actions',color:'#dc2626',bg:'rgba(220,38,38,.1)',trend:0},
    {label:'Seats Available',value:d?.seatsAvailable??0,currency:false,icon:'chair',color:'#d97706',bg:'rgba(217,119,6,.1)',trend:0}]});
  readonly chartData=computed<ChartConfiguration<'bar'>['data']>(()=>({labels:this.data()?.salesByTicketType.map(x=>x.name)??[],datasets:[{data:this.data()?.salesByTicketType.map(x=>x.sold)??[],label:'Tickets sold',backgroundColor:'#c9a84c'}]}));
  ngOnInit(){this.adminService.dashboard().subscribe(d=>this.data.set(d));}

  readonly quickActions = [
    { label: "Create Event", icon: "add_circle",      route: "/admin/events/new", color: "#6366f1", bg: "rgba(99,102,241,.1)" },
    { label: "View Orders",  icon: "receipt_long",    route: "/admin/orders",     color: "#16a34a", bg: "rgba(22,163,74,.1)"  },
    { label: "Scan Tickets", icon: "qr_code_scanner", route: "/admin/scanner",    color: "#0891b2", bg: "rgba(8,145,178,.1)"  },
    { label: "View Reports", icon: "bar_chart",       route: "/admin/reports",    color: "#d97706", bg: "rgba(217,119,6,.1)"  },
  ];
}
