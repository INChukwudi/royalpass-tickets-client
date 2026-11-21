import { Component, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HubConnection } from '@microsoft/signalr';
import { ParticipantGameState } from '../../../core/models/game.models';
import { GameService } from '../../../core/services/game.service';
import { GameRealtimeService } from '../../../core/services/game-realtime.service';

@Component({selector:'app-game-play',standalone:true,templateUrl:'./game-play.component.html',styleUrl:'./game-play.component.scss'})
export class GamePlayComponent implements OnInit,OnDestroy{
  private readonly api=inject(GameService);private readonly realtime=inject(GameRealtimeService);private readonly router=inject(Router);private readonly zone=inject(NgZone);private connection?:HubConnection;private reconnectTimer?:ReturnType<typeof setTimeout>;private clock?:ReturnType<typeof setInterval>;private destroyed=false;private readonly now=signal(Date.now());readonly state=signal<ParticipantGameState|null>(null);readonly submitting=signal(false);readonly connected=signal(false);readonly error=signal<string|null>(null);readonly token=localStorage.getItem('royalpass_game_token')??'';
  readonly secondsLeft=computed(()=>{const end=this.state()?.question?.closesAt;return end?Math.max(0,Math.ceil((new Date(end).getTime()-this.now())/1000)):0;});
  ngOnInit():void{if(!this.token){this.router.navigate(['/games/join']);return;}this.load();void this.connectRealtime();this.clock=setInterval(()=>this.now.set(Date.now()),250);}
  ngOnDestroy():void{this.destroyed=true;if(this.clock)clearInterval(this.clock);if(this.reconnectTimer)clearTimeout(this.reconnectTimer);void this.connection?.stop();}
  load(silent=false):void{this.api.participantState(this.token).subscribe({next:x=>{this.state.set(x);if(!silent)this.error.set(null);},error:e=>{if(!silent)this.error.set(e?.error?.message??'Could not reconnect to the game.');if(e?.status===401){localStorage.removeItem('royalpass_game_token');this.router.navigate(['/games/join']);}}});}
  answer(optionId:string|null):void{const question=this.state()?.question;if(!optionId||!question||this.state()?.selectedOptionId||this.submitting())return;this.submitting.set(true);this.api.answer(this.token,question.id,optionId).subscribe({next:()=>{this.submitting.set(false);this.load();},error:e=>{this.submitting.set(false);this.error.set(e?.error?.message??'Your answer could not be submitted.');this.load(true);}});}
  leave():void{localStorage.removeItem('royalpass_game_token');this.router.navigate(['/games/join']);}
  private async connectRealtime():Promise<void>{try{const connection=await this.realtime.participant(this.token,()=>this.zone.run(()=>this.load(true)),value=>this.zone.run(()=>this.connected.set(value)));if(this.destroyed){await connection.stop();return;}this.connection=connection;}catch{this.connected.set(false);if(!this.destroyed)this.reconnectTimer=setTimeout(()=>void this.connectRealtime(),3000);}}
}
