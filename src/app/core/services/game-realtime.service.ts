import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

@Injectable({providedIn:'root'})
export class GameRealtimeService {
  private readonly hubBase=environment.apiUrl.replace(/\/api\/?$/,'');

  host(sessionId:string,onUpdate:()=>void,onConnected:(connected:boolean)=>void,onReconnectRequired?:()=>void):Promise<HubConnection>{
    return this.connect(`${this.hubBase}/hubs/games/host`,[sessionId],onUpdate,onConnected,'JoinSession',onReconnectRequired);
  }

  participant(token:string,onUpdate:()=>void,onConnected:(connected:boolean)=>void,onReconnectRequired?:()=>void):Promise<HubConnection>{
    return this.connect(`${this.hubBase}/hubs/games/participant`,[token],onUpdate,onConnected,'JoinSession',onReconnectRequired);
  }

  discovery(onUpdate:()=>void,onConnected:(connected:boolean)=>void,onReconnectRequired?:()=>void):Promise<HubConnection>{
    return this.connect(`${this.hubBase}/hubs/games/participant`,[],onUpdate,onConnected,'JoinDiscovery',onReconnectRequired);
  }

  private async connect(url:string,joinArguments:unknown[],onUpdate:()=>void,onConnected:(connected:boolean)=>void,joinMethod='JoinSession',onReconnectRequired?:()=>void):Promise<HubConnection>{
    const connection=new HubConnectionBuilder().withUrl(url,{
      withCredentials:true,
      transport:HttpTransportType.WebSockets|HttpTransportType.LongPolling,
      timeout:20000
    })
      .withAutomaticReconnect({nextRetryDelayInMilliseconds:context=>[0,500,1000,2000,5000,10000,15000][context.previousRetryCount]??null})
      .withStatefulReconnect({bufferSize:100000})
      .configureLogging(LogLevel.Warning).build();
    connection.keepAliveIntervalInMilliseconds=10000;
    connection.serverTimeoutInMilliseconds=45000;
    const joinGroup=()=>connection.invoke(joinMethod,...joinArguments);
    let updateTimer:ReturnType<typeof setTimeout>|undefined;
    connection.on('gameUpdated',()=>{if(updateTimer)return;updateTimer=setTimeout(()=>{updateTimer=undefined;onUpdate();},100);});
    connection.onreconnecting(()=>onConnected(false));
    connection.onreconnected(async()=>{await joinGroup();onConnected(true);onUpdate();});
    connection.onclose(error=>{onConnected(false);if(error)onReconnectRequired?.();});
    await connection.start();await joinGroup();onConnected(true);
    return connection;
  }

}
