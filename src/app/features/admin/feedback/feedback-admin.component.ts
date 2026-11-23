import { CommonModule } from '@angular/common';
import { Component,ElementRef,ViewChild,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserQRCodeSvgWriter } from '@zxing/browser';
import { EventService } from '../../../core/services/event.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { FeedbackDashboard,FeedbackSettings } from '../../../core/models/feedback.models';
import { EventSummaryDto } from '../../../core/models/event.models';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

@Component({selector:'app-feedback-admin',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./feedback-admin.component.html',styleUrl:'./feedback-admin.component.scss'})
export class FeedbackAdminComponent{
 private readonly eventsApi=inject(EventService);private readonly api=inject(FeedbackService);private readonly toast=inject(ToastService);private qr?:ElementRef<HTMLElement>;
 @ViewChild('qr')set qrElement(value:ElementRef<HTMLElement>|undefined){this.qr=value;this.renderQr()}
 readonly events=signal<EventSummaryDto[]>([]);readonly selectedId=signal('');readonly dashboard=signal<FeedbackDashboard|null>(null);readonly loading=signal(false);readonly saving=signal(false);
 settings:FeedbackSettings={isEnabled:false,requireTicketVerification:false,opensAt:null,closesAt:null,welcomeMessage:'Thank you for sharing your RoyalPass experience.'};
 constructor(){this.eventsApi.listEvents(1,100).subscribe(x=>{this.events.set(x.items);if(x.items[0]){this.selectedId.set(x.items[0].id);this.load()}})}
 select(value:string){this.selectedId.set(value);this.load()}
 load(){const id=this.selectedId();if(!id)return;this.loading.set(true);this.api.dashboard(id).subscribe({next:x=>{this.dashboard.set(x);this.settings={...x.settings};this.loading.set(false);this.renderQr()},error:e=>{this.loading.set(false);this.toast.error(apiErrorMessage(e,'Could not load feedback.'))}})}
 save(){const id=this.selectedId();if(!id||this.saving())return;this.saving.set(true);this.api.saveSettings(id,this.settings).subscribe({next:x=>{this.settings=x;this.saving.set(false);this.toast.success('Feedback settings saved.');this.load()},error:e=>{this.saving.set(false);this.toast.error(apiErrorMessage(e,'Could not save feedback settings.'))}})}
 feedbackUrl(){return `${location.origin}/events/${this.selectedId()}/feedback`}
 copy(){navigator.clipboard.writeText(this.feedbackUrl()).then(()=>this.toast.success('Feedback link copied.'))}
 download(){this.api.export(this.selectedId()).subscribe(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`feedback-${this.selectedId()}.csv`;a.click();URL.revokeObjectURL(url)})}
 entries(value:Record<string,number>|undefined){return Object.entries(value??{}).sort((a,b)=>b[1]-a[1])}
 private renderQr(){queueMicrotask(()=>{if(!this.qr?.nativeElement||!this.selectedId())return;const svg=new BrowserQRCodeSvgWriter().write(this.feedbackUrl(),180,180);svg.style.background='#fff';this.qr.nativeElement.replaceChildren(svg)})}
}
