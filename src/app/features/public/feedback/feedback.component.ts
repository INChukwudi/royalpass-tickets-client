import { CommonModule } from '@angular/common';
import { Component,computed,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute,RouterLink } from '@angular/router';
import { FeedbackService } from '../../../core/services/feedback.service';
import { FeedbackSubmission,PublicFeedbackForm } from '../../../core/models/feedback.models';
import { publicErrorMessage } from '../../../core/utils/public-error-message';

const emptyFeedback=():FeedbackSubmission=>({ticketCode:'',ticketEmail:'',respondentName:'',respondentEmail:'',overallRating:0,recommendScore:10,organizationRating:0,programmeRating:0,venueRating:0,productionRating:0,checkInRating:0,seatingRating:0,staffRating:0,ticketPurchaseRating:0,paymentRating:0,ticketDeliveryRating:0,seatSelectionRating:0,favouriteMoment:'',improvements:'',keepForNextTime:'',additionalComments:'',improvementTopics:[],wouldAttendAgain:true,interestedInRoyalPass:false,mayContact:false,contactName:'',contactEmail:'',contactPhone:'',prospectiveEventType:'',prospectiveEventDetails:'',testimonialConsent:false});

@Component({selector:'app-feedback',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./feedback.component.html',styleUrl:'./feedback.component.scss'})
export class FeedbackComponent{
 private readonly api=inject(FeedbackService);private readonly route=inject(ActivatedRoute);readonly eventId=this.route.snapshot.paramMap.get('eventId')??'';private readonly draftKey=`royalpass_feedback_${this.eventId}`;
 readonly form=signal<PublicFeedbackForm|null>(null);readonly loading=signal(true);readonly submitting=signal(false);readonly complete=signal(false);readonly error=signal('');readonly step=signal(0);readonly progress=computed(()=>((this.step()+1)/5)*100);
 readonly topics=['Ticketing','Payment','Seating','Check-in','Venue','Programme','Sound & production','Staff','Communication','Refreshments'];
 value:FeedbackSubmission=this.loadDraft();
 constructor(){this.api.publicForm(this.eventId).subscribe({next:x=>{this.form.set(x);this.loading.set(false)},error:e=>{this.error.set(publicErrorMessage(e,'This feedback page could not be loaded.'));this.loading.set(false)}})}
 rate(key:keyof FeedbackSubmission,value:number){(this.value as any)[key]=value;this.persist();}
 toggleTopic(topic:string){this.value.improvementTopics=this.value.improvementTopics.includes(topic)?this.value.improvementTopics.filter(x=>x!==topic):[...this.value.improvementTopics,topic];this.persist();}
 next(){this.error.set('');if(!this.validStep())return;this.persist();this.step.update(x=>Math.min(4,x+1));window.scrollTo({top:0,behavior:'smooth'});}
 back(){this.error.set('');this.step.update(x=>Math.max(0,x-1));window.scrollTo({top:0,behavior:'smooth'});}
 submit(){if(!this.validStep()||this.submitting())return;this.submitting.set(true);this.error.set('');this.api.submit(this.eventId,this.value).subscribe({next:()=>{this.submitting.set(false);this.complete.set(true);localStorage.removeItem(this.draftKey);window.scrollTo({top:0,behavior:'smooth'})},error:e=>{this.submitting.set(false);this.error.set(publicErrorMessage(e,'We could not submit your feedback. Please try again.'))}})}
 private validStep(){
  const eventRatings=[this.value.overallRating,this.value.organizationRating,this.value.programmeRating,this.value.venueRating,this.value.productionRating,this.value.checkInRating,this.value.seatingRating,this.value.staffRating];
  const serviceRatings=[this.value.ticketPurchaseRating,this.value.paymentRating,this.value.ticketDeliveryRating,this.value.seatSelectionRating];
  if(this.step()===0&&this.form()?.requireTicketVerification&&(!this.value.ticketCode.trim()||!this.value.ticketEmail.trim()))return this.fail('Enter the ticket number and email address used for the ticket.');
  if(this.step()===1&&eventRatings.some(x=>x<1))return this.fail('Please complete every rating before continuing.');
  if(this.step()===2&&serviceRatings.some(x=>x<1))return this.fail('Please complete every rating before continuing.');
  if(this.step()===4&&this.value.mayContact&&!this.value.contactEmail.trim()&&!this.value.contactPhone.trim())return this.fail('Provide an email address or phone number for the RoyalPass team.');
  return true;
 }
 private fail(message:string){this.error.set(message);return false;}
 private persist(){localStorage.setItem(this.draftKey,JSON.stringify(this.value));}
 private loadDraft(){try{return {...emptyFeedback(),...JSON.parse(localStorage.getItem(this.draftKey)??'{}')}}catch{return emptyFeedback()}}
}
