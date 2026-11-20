import { AfterViewInit, Component, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AdminService } from '../../../core/services/admin.service';
import { CheckInSearchResult, CheckInTicketDetails, ScanResult } from '../../../core/models/admin.models';

@Component({selector:'app-scanner',standalone:true,imports:[CommonModule,FormsModule,MatIconModule],templateUrl:'./scanner.component.html',styleUrl:'./scanner.component.scss'})
export class ScannerComponent implements AfterViewInit, OnDestroy {
  private readonly admin=inject(AdminService);
  private readonly zone=inject(NgZone);
  private scanner:Html5Qrcode|null=null;private cameraOperation:Promise<void>|null=null;private destroyed=false;
  private lastCameraValue='';private lastCameraScanAt=0;private preparedCredential='';
  cameraEnabled=true;code='';query='';
  readonly processing=signal(false);readonly assigningSeat=signal(false);readonly seatModalOpen=signal(false);
  readonly cameraRunning=signal(false);
  readonly result=signal<ScanResult|null>(null);readonly details=signal<CheckInTicketDetails|null>(null);
  readonly matches=signal<CheckInSearchResult[]>([]);readonly cameraMessage=signal('Point the camera at the ticket QR code.');

  ngAfterViewInit():void{void this.startCamera();}
  ngOnDestroy():void{this.destroyed=true;void this.stopCamera();}

  scanSuccess(value:string):void{const now=Date.now();if(this.processing()||(value===this.lastCameraValue&&now-this.lastCameraScanAt<5000))return;this.lastCameraValue=value;this.lastCameraScanAt=now;this.cameraMessage.set('QR code detected. Looking up ticket...');this.prepare(value);}

  async toggleCamera():Promise<void>{if(this.cameraRunning()){this.cameraEnabled=false;await this.stopCamera();return;}this.cameraEnabled=true;await this.startCamera();}

  private async startCamera():Promise<void>{
    if(this.destroyed||!this.cameraEnabled||this.cameraRunning()||this.cameraOperation)return;
    this.cameraMessage.set('Starting the rear camera...');
    this.scanner??=new Html5Qrcode('gate-qr-reader',{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],useBarCodeDetectorIfSupported:true,verbose:false});
    this.cameraOperation=this.startWithRearCamera().finally(()=>this.cameraOperation=null);
    await this.cameraOperation;
  }

  private async startWithRearCamera():Promise<void>{
    if(!this.scanner)return;
    const config={fps:12,qrbox:(width:number,height:number)=>{const size=Math.max(180,Math.min(360,Math.floor(Math.min(width,height)*.72)));return {width:size,height:size};},disableFlip:false};
    const onSuccess=(text:string)=>this.zone.run(()=>this.scanSuccess(text));
    try{
      await this.scanner.start({facingMode:{ideal:'environment'}},config,onSuccess,()=>undefined);
    }catch(firstError){
      try{
        const cameras=await Html5Qrcode.getCameras();
        if(!cameras.length)throw firstError;
        const rear=cameras.find(camera=>/back|rear|environment/i.test(camera.label))??cameras.at(-1)!;
        await this.scanner.start(rear.id,config,onSuccess,()=>undefined);
      }catch(error){this.zone.run(()=>this.cameraMessage.set(this.cameraFailureMessage(error)));return;}
    }
    if(this.destroyed||!this.cameraEnabled){await this.scanner.stop().catch(()=>undefined);return;}
    this.zone.run(()=>{this.cameraRunning.set(true);this.cameraMessage.set('Camera ready. Hold the QR code inside the square.');});
  }

  private async stopCamera():Promise<void>{
    if(this.cameraOperation)await this.cameraOperation.catch(()=>undefined);
    const scanner=this.scanner;if(!scanner)return;
    try{if(scanner.getState()===Html5QrcodeScannerState.SCANNING||scanner.getState()===Html5QrcodeScannerState.PAUSED)await scanner.stop();}catch{/** Camera may already have been released by the browser. */}
    this.cameraRunning.set(false);
    if(!this.destroyed)this.cameraMessage.set('Camera stopped.');
  }

  private cameraFailureMessage(error:unknown):string{
    const message=String(error).toLowerCase();
    if(message.includes('permission')||message.includes('notallowed'))return 'Camera permission was denied. Allow camera access in the browser and start the camera again.';
    if(message.includes('secure')||(!window.isSecureContext&&location.hostname!=='localhost'))return 'Camera scanning requires a secure HTTPS connection.';
    return 'The camera could not be started. Check that another app is not using it, then try again.';
  }

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
