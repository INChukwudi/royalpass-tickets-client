import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GameLobby } from '../../../core/models/game.models';
import { GameService } from '../../../core/services/game.service';

@Component({selector:'app-game-join',standalone:true,imports:[FormsModule],templateUrl:'./game-join.component.html',styleUrl:'./game-join.component.scss'})
export class GameJoinComponent implements OnInit{
  private readonly api=inject(GameService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);pin='';seatId='';readonly lobby=signal<GameLobby|null>(null);readonly loading=signal(false);readonly joining=signal(false);readonly error=signal<string|null>(null);
  ngOnInit():void{this.pin=this.route.snapshot.queryParamMap.get('pin')??'';if(this.pin)this.find();}
  find():void{this.pin=this.pin.replace(/\D/g,'').slice(0,6);if(this.pin.length!==6){this.error.set('Enter the six-digit game PIN.');return;}this.loading.set(true);this.error.set(null);this.api.lobby(this.pin).subscribe({next:x=>{this.lobby.set(x);this.loading.set(false);this.seatId='';},error:e=>{this.loading.set(false);this.lobby.set(null);this.error.set(e?.error?.message??'Game PIN not found.');}});}
  join():void{if(!this.seatId||this.joining())return;this.joining.set(true);this.error.set(null);this.api.join(this.pin,this.seatId).subscribe({next:x=>{localStorage.setItem('royalpass_game_token',x.participantToken);this.router.navigate(['/games/play']);},error:e=>{this.joining.set(false);this.error.set(e?.error?.message??'Could not join the game.');this.find();}});}
}
