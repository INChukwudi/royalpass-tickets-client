import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Game, GameLobby, HostGameState, ParticipantGameState, SaveGame } from '../models/game.models';

@Injectable({providedIn:'root'})
export class GameService {
  private readonly http=inject(HttpClient);private readonly base=environment.apiUrl;
  list():Observable<Game[]>{return this.http.get<Game[]>(`${this.base}/admin/games`);}
  get(id:string):Observable<Game>{return this.http.get<Game>(`${this.base}/admin/games/${id}`);}
  create(value:SaveGame):Observable<Game>{return this.http.post<Game>(`${this.base}/admin/games`,value);}
  update(id:string,value:SaveGame):Observable<Game>{return this.http.put<Game>(`${this.base}/admin/games/${id}`,value);}
  createSession(id:string):Observable<{sessionId:string;pin:string}>{return this.http.post<{sessionId:string;pin:string}>(`${this.base}/admin/games/${id}/sessions`,{});}
  hostState(id:string):Observable<HostGameState>{return this.http.get<HostGameState>(`${this.base}/admin/game-sessions/${id}`);}
  hostAction(id:string,action:string):Observable<HostGameState>{return this.http.post<HostGameState>(`${this.base}/admin/game-sessions/${id}/${action}`,{});}
  lobby(pin:string):Observable<GameLobby>{return this.http.get<GameLobby>(`${this.base}/games/${encodeURIComponent(pin)}/seats`);}
  join(pin:string,seatId:string):Observable<{participantToken:string;seatLabel:string;gameTitle:string}>{return this.http.post<{participantToken:string;seatLabel:string;gameTitle:string}>(`${this.base}/games/join`,{pin,seatId});}
  participantState(token:string):Observable<ParticipantGameState>{return this.http.get<ParticipantGameState>(`${this.base}/games/state`,{headers:this.tokenHeader(token)});}
  answer(token:string,questionId:string,optionId:string):Observable<{accepted:boolean}>{return this.http.post<{accepted:boolean}>(`${this.base}/games/answers`,{questionId,optionId},{headers:this.tokenHeader(token)});}
  private tokenHeader(token:string):HttpHeaders{return new HttpHeaders({'X-Game-Token':token});}
}
