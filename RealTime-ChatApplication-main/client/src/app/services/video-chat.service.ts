import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class VideoChatService {

private hubUrl = "http://localhost:5000/hubs/video";
public hubConnection!: HubConnection;

public incomingCall = false;
public isCallActive = false;
public remoteUserId = '';
public peerConnection!: RTCPeerConnection;

public offerReceived = new BehaviorSubject<{senderId: string, offer: RTCSessionDescriptionInit}|null>(null);
public answerReceived = new BehaviorSubject<{senderId: string, answer: RTCSessionDescriptionInit}|null>(null);
public iceCandidateReceived = new BehaviorSubject<{senderId: string, candidate: RTCIceCandidate}|null>(null);

private authService = inject(AuthService);

async startConnection(): Promise<boolean> {
    this.hubConnection = new HubConnectionBuilder()
        .withUrl(this.hubUrl, {
            accessTokenFactory: () => this.authService.getAccessToken()!
        })
        .withAutomaticReconnect()
        .build();

    // Add connection state logging for debugging
    this.hubConnection.onclose((error) => {
        console.log('SignalR connection closed', error);
        this.isCallActive = false;
        this.incomingCall = false;
    });

    this.hubConnection.onreconnecting((error) => {
        console.log('SignalR reconnecting', error);
    });

    this.hubConnection.onreconnected((connectionId) => {
        console.log('SignalR reconnected with ID:', connectionId);
    });

    try {
        await this.hubConnection.start();
        console.log("SignalR Connected successfully");
        
        // Setup message handlers only after connection is established
        this.hubConnection.on("ReceiveOffer", (senderId, offer) => {
            console.log("Offer received from", senderId);
            this.offerReceived.next({senderId, offer: JSON.parse(offer)});
        });

        this.hubConnection.on("ReceiveAnswer", (senderId, answer) => {
            console.log("Answer received from", senderId);
            this.answerReceived.next({senderId, answer: JSON.parse(answer)});
        });

        this.hubConnection.on("ReceiveIceCandidate", (senderId, candidate) => {
            console.log("ICE candidate received from", senderId);
            this.iceCandidateReceived.next({senderId, candidate: JSON.parse(candidate)});
        });

        return true;
    } catch (err) {
        console.error("SignalR Connection Error", err);
        return false;
    }
}
sendOffer(receiverId: string, offer: RTCSessionDescriptionInit) {
    if (this.hubConnection.state !== 'Connected') {
        console.error("Cannot send offer - connection not ready");
        return;
    }
    this.hubConnection.invoke("SendOffer", receiverId, JSON.stringify(offer))
        .catch(err => console.error("SendOffer failed", err));
}

  sendAnswer(receiverId: string, answer: RTCSessionDescriptionInit) {
    this.hubConnection.invoke("SendAnswer", receiverId, JSON.stringify(answer));
  }

  sendIceCandidate(receiverId: string, candidate: RTCIceCandidate) {
    this.hubConnection.invoke("SendIceCandidate", receiverId, JSON.stringify(candidate));
  }

  sendEndCall(receiverId: string) {
    this.hubConnection.invoke('EndCall', receiverId);
  }
  public async notifyIncomingCall(recipientId: string) {
    await this.hubConnection.invoke('NotifyIncomingCall', recipientId);
}
}