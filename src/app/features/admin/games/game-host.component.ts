import { Component, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HubConnection } from '@microsoft/signalr';
import { HostGameState } from '../../../core/models/game.models';
import { GameService } from '../../../core/services/game.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameRealtimeService } from '../../../core/services/game-realtime.service';

@Component({selector:'app-game-host',standalone:true,templateUrl:'./game-host.component.html',styleUrl:'./game-host.component.scss'})
export class GameHostComponent implements OnInit,OnDestroy{
  private readonly api=inject(GameService);private readonly realtime=inject(GameRealtimeService);private readonly route=inject(ActivatedRoute);private readonly toast=inject(ToastService);private readonly zone=inject(NgZone);private connection?:HubConnection;private reconnectTimer?:ReturnType<typeof setTimeout>;private clock?:ReturnType<typeof setInterval>;private destroyed=false;private readonly now=signal(Date.now());readonly state=signal<HostGameState|null>(null);readonly acting=signal(false);readonly connected=signal(false);readonly sessionId=this.route.snapshot.paramMap.get('sessionId')!;
  readonly secondsLeft=computed(()=>{const end=this.state()?.questionClosesAt;return end?Math.max(0,Math.ceil((new Date(end).getTime()-this.now())/1000)):0;});
  readonly joinUrl=computed(()=>`${location.origin}/games/join?pin=${this.state()?.pin??''}`);
  ngOnInit():void{this.load();void this.connectRealtime();this.clock=setInterval(()=>{this.now.set(Date.now());if(this.state()?.status==='Question'&&this.secondsLeft()===0&&!this.acting())this.action('close');},250);}
  ngOnDestroy():void{this.destroyed=true;if(this.clock)clearInterval(this.clock);if(this.reconnectTimer)clearTimeout(this.reconnectTimer);void this.connection?.stop();}
  load(silent=false):void{if(silent&&this.acting())return;this.api.hostState(this.sessionId).subscribe({next:x=>this.state.set(x),error:()=>{if(!silent)this.toast.error('Could not load the game session.');}});}
  action(name:string):void{if(this.acting())return;this.acting.set(true);this.api.hostAction(this.sessionId,name).subscribe({next:x=>{this.state.set(x);this.acting.set(false);},error:e=>{this.acting.set(false);this.toast.error(e?.error?.message??'The game action failed.');}});}
  optionCount(id:string|null):number{return id?this.state()?.question?.answerCounts[id]??0:0;}
  maxCount():number{return Math.max(1,...Object.values(this.state()?.question?.answerCounts??{}));}
  private async connectRealtime():Promise<void>{try{const connection=await this.realtime.host(this.sessionId,()=>this.zone.run(()=>this.load(true)),value=>this.zone.run(()=>this.connected.set(value)));if(this.destroyed){await connection.stop();return;}this.connection=connection;}catch{this.connected.set(false);if(!this.destroyed)this.reconnectTimer=setTimeout(()=>void this.connectRealtime(),3000);}}
}
