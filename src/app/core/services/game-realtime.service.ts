import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

@Injectable({providedIn:'root'})
export class GameRealtimeService {
  private readonly hubBase=environment.apiUrl.replace(/\/api\/?$/,'');

  host(sessionId:string,onUpdate:()=>void,onConnected:(connected:boolean)=>void):Promise<HubConnection>{
    return this.connect(`${this.hubBase}/hubs/games/host`,[sessionId],onUpdate,onConnected);
  }

  participant(token:string,onUpdate:()=>void,onConnected:(connected:boolean)=>void):Promise<HubConnection>{
    return this.connect(`${this.hubBase}/hubs/games/participant`,[token],onUpdate,onConnected);
  }

  discovery(onUpdate:()=>void,onConnected:(connected:boolean)=>void):Promise<HubConnection>{
    return this.connect(`${this.hubBase}/hubs/games/participant`,[],onUpdate,onConnected,'JoinDiscovery');
  }

  private async connect(url:string,joinArguments:unknown[],onUpdate:()=>void,onConnected:(connected:boolean)=>void,joinMethod='JoinSession'):Promise<HubConnection>{
    const connection=new HubConnectionBuilder().withUrl(url,{withCredentials:true})
      .withAutomaticReconnect({nextRetryDelayInMilliseconds:context=>Math.min(30000,1000*2**Math.min(context.previousRetryCount,5))})
      .configureLogging(LogLevel.Warning).build();
    const joinGroup=()=>connection.invoke(joinMethod,...joinArguments);
    let updateTimer:ReturnType<typeof setTimeout>|undefined;
    connection.on('gameUpdated',()=>{if(updateTimer)return;updateTimer=setTimeout(()=>{updateTimer=undefined;onUpdate();},100);});
    connection.onreconnecting(()=>onConnected(false));
    connection.onreconnected(async()=>{await joinGroup();onConnected(true);onUpdate();});
    connection.onclose(()=>onConnected(false));
    await connection.start();await joinGroup();onConnected(true);
    return connection;
  }
}
