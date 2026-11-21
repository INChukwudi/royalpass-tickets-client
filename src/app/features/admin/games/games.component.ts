import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Game, GameQuestion, SaveGame } from '../../../core/models/game.models';
import { EventSummaryDto } from '../../../core/models/event.models';
import { EventService } from '../../../core/services/event.service';
import { GameService } from '../../../core/services/game.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({selector:'app-games',standalone:true,imports:[FormsModule],templateUrl:'./games.component.html',styleUrl:'./games.component.scss'})
export class GamesComponent implements OnInit {
  private readonly gamesApi=inject(GameService);private readonly eventsApi=inject(EventService);private readonly toast=inject(ToastService);private readonly router=inject(Router);
  readonly games=signal<Game[]>([]);readonly events=signal<EventSummaryDto[]>([]);readonly loading=signal(true);readonly saving=signal(false);readonly deletingId=signal<string|null>(null);readonly editorOpen=signal(false);readonly editingId=signal<string|null>(null);
  form:SaveGame=this.emptyGame();
  ngOnInit():void{this.load();this.eventsApi.listEvents(1,100).subscribe(x=>this.events.set(x.items));}
  load():void{this.loading.set(true);this.gamesApi.list().subscribe({next:x=>{this.games.set(x);this.loading.set(false);},error:()=>{this.loading.set(false);this.toast.error('Could not load games.');}});}
  create():void{this.editingId.set(null);this.form=this.emptyGame();this.editorOpen.set(true);}
  edit(game:Game):void{if(game.sessionCount){this.toast.warning('Games with sessions are locked. Create a new game to make changes.');return;}this.editingId.set(game.id);this.form={eventId:game.eventId,title:game.title,description:game.description,leaderboardEveryQuestions:game.leaderboardEveryQuestions,questions:game.questions.map(q=>({...q,options:q.options.map(o=>({...o}))}))};this.editorOpen.set(true);}
  addQuestion():void{this.form.questions.push(this.emptyQuestion(this.form.questions.length));}
  removeQuestion(index:number):void{if(this.form.questions.length===1)return;this.form.questions.splice(index,1);this.reorder();}
  addOption(question:GameQuestion):void{if(question.options.length<6)question.options.push({id:null,text:'',position:question.options.length,isCorrect:false});}
  removeOption(question:GameQuestion,index:number):void{if(question.options.length>2){question.options.splice(index,1);question.options.forEach((x,i)=>x.position=i);}}
  correct(question:GameQuestion,index:number):void{question.options.forEach((x,i)=>x.isCorrect=i===index);}
  save():void{if(this.saving())return;this.reorder();this.saving.set(true);const id=this.editingId();const request=id?this.gamesApi.update(id,this.form):this.gamesApi.create(this.form);request.subscribe({next:()=>{this.saving.set(false);this.editorOpen.set(false);this.toast.success(id?'Game updated.':'Game created.');this.load();},error:e=>{this.saving.set(false);this.toast.error(e?.error?.message??'Could not save the game.');}});}
  host(game:Game):void{this.gamesApi.createSession(game.id).subscribe({next:x=>this.router.navigate(['/admin/games/host',x.sessionId]),error:e=>this.toast.error(e?.error?.message??'Could not start a game session.')});}
  deleteGame(game:Game):void{if(this.deletingId())return;const history=game.sessionCount?' Its session history will be archived safely.':'';if(!window.confirm(`Delete “${game.title}”?${history} This will remove it from the games list.`))return;this.deletingId.set(game.id);this.gamesApi.delete(game.id).subscribe({next:()=>{this.deletingId.set(null);this.games.update(items=>items.filter(x=>x.id!==game.id));this.toast.success('Game deleted.');},error:e=>{this.deletingId.set(null);this.toast.error(e?.error?.message??'Could not delete the game.');}});}
  private reorder():void{this.form.questions.forEach((q,i)=>{q.position=i;q.options.forEach((o,j)=>o.position=j);});}
  private emptyGame():SaveGame{return {eventId:'',title:'',description:null,leaderboardEveryQuestions:3,questions:[this.emptyQuestion(0)]};}
  private emptyQuestion(position:number):GameQuestion{return {id:null,prompt:'',position,timeLimitSeconds:20,points:1000,options:[{id:null,text:'',position:0,isCorrect:true},{id:null,text:'',position:1,isCorrect:false}]};}
}
