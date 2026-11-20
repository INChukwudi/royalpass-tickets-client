import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { AdminService } from '../../../core/services/admin.service';
import { CheckInSearchResult, CheckInTicketDetails, ScanResult } from '../../../core/models/admin.models';

@Component({selector:'app-scanner',standalone:true,imports:[CommonModule,FormsModule,MatIconModule,ZXingScannerModule],templateUrl:'./scanner.component.html',styleUrl:'./scanner.component.scss'})
export class ScannerComponent {
  private readonly admin=inject(AdminService);
  private lastCameraValue='';private lastCameraScanAt=0;private preparedCredential='';
  readonly formats=[BarcodeFormat.QR_CODE];
  readonly videoConstraints:MediaTrackConstraints={facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}};
  cameraEnabled=true;code='';query='';
  readonly processing=signal(false);readonly assigningSeat=signal(false);readonly seatModalOpen=signal(false);
  readonly result=signal<ScanResult|null>(null);readonly details=signal<CheckInTicketDetails|null>(null);
  readonly matches=signal<CheckInSearchResult[]>([]);readonly cameraMessage=signal('Point the camera at the ticket QR code.');

  scanSuccess(value:string):void{const now=Date.now();if(this.processing()||(value===this.lastCameraValue&&now-this.lastCameraScanAt<5000))return;this.lastCameraValue=value;this.lastCameraScanAt=now;this.cameraMessage.set('QR code detected. Looking up ticket…');this.prepare(value);}
  permissionResponse(allowed:boolean):void{this.cameraMessage.set(allowed?'Camera ready. Point it at the ticket QR code.':'Camera permission was denied. Allow camera access or enter the visible ticket number.');}
  camerasFound(cameras:MediaDeviceInfo[]):void{if(!cameras.length)this.cameraMessage.set('No camera was found. Enter the visible ticket number instead.');}
  cameraError():void{this.cameraMessage.set('The camera could not read from this device. Restart it or enter the visible ticket number.');}

  prepare(value=this.code):void{
    const credential=value.trim();if(!credential||this.processing())return;
    this.processing.set(true);this.result.set(null);
    this.admin.prepareCheckIn(credential).subscribe({next:ticket=>{this.processing.set(false);this.code='';this.details.set(ticket.found?ticket:null);this.preparedCredential=credential;if(!ticket.found){this.result.set(this.invalidResult(ticket.message,credential));this.cameraMessage.set('Ticket not found. Ready to scan again.');return;}this.cameraMessage.set('Ticket found. Confirm the guest details before check-in.');this.seatModalOpen.set(ticket.canCheckIn&&!ticket.seatLabel);},error:e=>{this.processing.set(false);this.result.set(this.invalidResult(e?.error?.message??'Ticket lookup failed.',credential));this.cameraMessage.set('Lookup failed. Ready to try again.');}});
  }

  checkIn():void{
    const ticket=this.details();if(!ticket?.canCheckIn||!ticket.seatLabel||this.processing())return;
    this.processing.set(true);
    this.admin.scan(ticket.ticketCode??this.preparedCredential).subscribe({next:r=>{this.result.set(r);this.processing.set(false);this.details.set({...ticket,status:r.admitted?'CheckedIn':ticket.status,checkedInAt:r.checkedInAt,canCheckIn:!r.admitted&&r.decision!=='already_used'});this.cameraMessage.set('Ready to scan the next ticket.');},error:e=>{this.result.set(this.invalidResult(e?.error?.message??'Check-in failed.',ticket.ticketCode??''));this.processing.set(false);}});
  }

  assignSeat():void{
    const ticket=this.details();if(!ticket?.ticketId||this.assigningSeat())return;
    this.assigningSeat.set(true);
    this.admin.assignCheckInSeat(ticket.ticketId).subscribe({next:updated=>{this.details.set(updated);this.assigningSeat.set(false);this.seatModalOpen.set(false);},error:e=>{this.assigningSeat.set(false);this.result.set(this.invalidResult(e?.error?.message??'No seat could be assigned.',ticket.ticketCode??''));}});
  }

  search():void{if(!this.query.trim())return;this.admin.checkInSearch(this.query.trim()).subscribe(r=>this.matches.set(r));}
  review(ticket:CheckInSearchResult):void{this.prepare(ticket.ticketCode);}
  private invalidResult(message:string,code:string):ScanResult{return {admitted:false,decision:'invalid',message,ticketId:null,ticketCode:code,guestName:null,eventTitle:null,ticketType:null,checkedInAt:null,seatLabel:null};}
}
