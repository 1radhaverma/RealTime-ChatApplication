import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { VideoChatService } from '../services/video-chat.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-video-chat',
  imports: [MatIconModule],
  template: `
<div class="relative h-full w-full">
  <!-- Local Video (Picture-in-Picture) -->
  <video class="w-32 absolute right-5 top-4 h-52 object-cover border-red-500 border-2 rounded-lg"
         #localVideo autoplay playsinline></video>
  
  <!-- Remote Video (Main View) -->
  <video class="w-full h-full object-cover bg-slate-800"
         #remoteVideo autoplay playsinline></video>
  
  <!-- Call Control Buttons -->
  <div class="absolute bottom-10 left-0 right-0 z-50 flex justify-center space-x-3 p-4">
    @if (signalRService.incomingCall) {
      <!-- Accept Button -->
      <button class="bg-green-500 flex items-center gap-2 hover:bg-gray-700 shadow-xl text-white font-bold py-2 px-4 rounded-full" (click)="acceptCall()">
          <mat-icon>call</mat-icon>
          Accept
      </button>

      <!-- Decline Button -->
      <button class="bg-red-500 flex items-center gap-2 hover:bg-gray-700 shadow-xl text-white font-bold py-2 px-4 rounded-full" (click)="declineCall()">
          <mat-icon>call_end</mat-icon>
          Decline
      </button>
    }
    
    @if (!signalRService.incomingCall && !this.signalRService.isCallActive) {
      <button class="bg-green-500 flex items-center gap-2 hover:bg-gray-700 shadow-xl text-white font-bold py-2 px-4 rounded-full" (click)="startCall()">
        <mat-icon>call</mat-icon>
        Start Call
      </button>
    }
     @if (!this.signalRService.incomingCall) {
       <button class="bg-red-500 flex items-center gap-2 hover:bg-red-700 shadow-xl text-white font-bold py-2 px-4 rounded-full" (click)="endCall()">
        <mat-icon>call_end</mat-icon>
        End Call
      </button>
    }
  </div>
</div>
`,
  styles: ``
})
export class VideoChatComponent implements OnInit {
@ViewChild("localVideo") localVideo!: ElementRef<HTMLVideoElement>;
@ViewChild("remoteVideo") remoteVideo!: ElementRef<HTMLVideoElement>;

private peerConnection!: RTCPeerConnection;
signalRService = inject(VideoChatService);
private dialogRef : MatDialogRef<VideoChatComponent> = inject(MatDialogRef);
 private ringtone: HTMLAudioElement;

  constructor() {
    this.ringtone = new Audio('assets/mixkit-on-hold-ringtone-1361.wav');
    this.ringtone.loop = true;
}async ngOnInit(): Promise<void> {
    try {
        await this.signalRService.startConnection();
        this.setupPeerConnection();
        this.startLocalVideo();
        this.setupSignalListeners();
    } catch (error) {
        console.error("Failed to initialize video chat", error);
        this.dialogRef.close();
    }
}

setupSignalListeners() {
    const pendingIceCandidates: RTCIceCandidate[] = [];
    let isRemoteDescriptionSet = false;

    this.signalRService.hubConnection.on('CallEnded', () => {
        this.endCall();
    });

    // Add this listener for incoming calls
    this.signalRService.hubConnection.on('IncomingCall', () => {
        this.playRingtone();
    });

    this.signalRService.answerReceived.subscribe(async (data) => {
        if (data) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            isRemoteDescriptionSet = true;
            pendingIceCandidates.forEach(candidate => {
                this.peerConnection.addIceCandidate(candidate).catch(e => console.error("Error adding pending ICE candidate", e));
            });
            pendingIceCandidates.length = 0;
        }
    });

    this.signalRService.iceCandidateReceived.subscribe(async (data) => {
        if (data) {
            const candidate = new RTCIceCandidate(data.candidate);
            if (!isRemoteDescriptionSet) {
                pendingIceCandidates.push(candidate);
            } else {
                try {
                    await this.peerConnection.addIceCandidate(candidate);
                } catch (e) {
                    console.error("Error adding ICE candidate", e);
                }
            }
        }
    });
}

// Add this method to handle ringtone playback
private playRingtone() {
    this.ringtone.currentTime = 0; // Reset to start
    this.ringtone.play().catch(e => console.error("Error playing ringtone:", e));
}

 declineCall(){
  this.ringtone.pause();
    this.ringtone.currentTime = 0;
  this.signalRService.incomingCall = false;
  this.signalRService.isCallActive = false;
  this.signalRService.sendEndCall(this.signalRService.remoteUserId);
  this.dialogRef.close();
 }

async acceptCall() {
    this.ringtone.pause();
    this.ringtone.currentTime = 0;
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = true;

    const offerData = await this.signalRService.offerReceived.getValue();
    if (!offerData) {
        this.endCall();
        return;
    }

    try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.signalRService.sendAnswer(offerData.senderId, answer);
    } catch (error) {
        console.error("Error accepting call:", error);
        this.endCall();
    }
}
async startCall() {
    if (!this.signalRService.hubConnection || this.signalRService.hubConnection.state !== 'Connected') {
        const connected = await this.signalRService.startConnection();
         this.ringtone.play().catch(e => console.error("Audio error:", e));
        if (!connected) {
            alert("Cannot start call - connection failed");
            return;
        }
    }

    try {
        this.signalRService.isCallActive = true;
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.signalRService.sendOffer(this.signalRService.remoteUserId, offer);
    } catch (error) {
        console.error("Call failed:", error);
        this.endCall();
    }
}

   ngOnDestroy() {
    this.endCall();
  }
setupPeerConnection() {
    // Close any existing connection first
    if (this.peerConnection) {
        this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' }
        ],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    });

    this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            this.signalRService.sendIceCandidate(this.signalRService.remoteUserId, event.candidate);
        }
    };

    this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            this.remoteVideo.nativeElement.srcObject = event.streams[0];
        }
    };

    this.peerConnection.onnegotiationneeded = async () => {
        console.log('Negotiation needed');
    };

    this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
        console.log('Signaling state:', this.peerConnection.signalingState);
    };
}
async startLocalVideo() {
   try {
        // First stop any existing streams
        await this.stopLocalStream();
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        this.localVideo.nativeElement.srcObject = stream;
        stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
        });
    } catch (error) {
        console.error("Error accessing media devices:", error);
        // Handle error - maybe show a message to the user
        throw error;
    }
    }
    private async stopLocalStream() {
    const localStream = this.localVideo.nativeElement.srcObject as MediaStream;
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        this.localVideo.nativeElement.srcObject = null;
    }
}
async endCall() {
     this.ringtone.pause();
    this.ringtone.currentTime = 0;
  
    
    if (this.peerConnection) {
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.close();
    }
   
    const localStream = this.localVideo.nativeElement.srcObject as MediaStream;
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        this.localVideo.nativeElement.srcObject = null;
    }

    if (this.remoteVideo.nativeElement.srcObject) {
        (this.remoteVideo.nativeElement.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        this.remoteVideo.nativeElement.srcObject = null;
    }

    this.signalRService.isCallActive = false;
    this.signalRService.incomingCall = false;
    this.signalRService.sendEndCall(this.signalRService.remoteUserId);
    this.signalRService.remoteUserId = '';
    
    this.dialogRef.close();
}
}