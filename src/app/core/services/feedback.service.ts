import { Injectable,inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FeedbackDashboard,FeedbackSettings,FeedbackSubmission,PublicFeedbackForm } from '../models/feedback.models';

@Injectable({providedIn:'root'})
export class FeedbackService{
 private readonly http=inject(HttpClient);private readonly base=environment.apiUrl;
 publicForm(eventId:string){return this.http.get<PublicFeedbackForm>(`${this.base}/events/${eventId}/feedback`);}
 submit(eventId:string,value:FeedbackSubmission){return this.http.post<void>(`${this.base}/events/${eventId}/feedback`,value);}
 settings(eventId:string){return this.http.get<FeedbackSettings>(`${this.base}/admin/events/${eventId}/feedback/settings`);}
 saveSettings(eventId:string,value:FeedbackSettings){return this.http.put<FeedbackSettings>(`${this.base}/admin/events/${eventId}/feedback/settings`,value);}
 dashboard(eventId:string){return this.http.get<FeedbackDashboard>(`${this.base}/admin/events/${eventId}/feedback`);}
 export(eventId:string){return this.http.get(`${this.base}/admin/events/${eventId}/feedback/export`,{responseType:'blob'});}
}
