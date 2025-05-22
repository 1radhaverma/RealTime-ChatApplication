import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoChatService } from './services/video-chat.service';
import { AuthService } from './services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { VideoChatComponent } from './video-chat/video-chat.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'client';
  private signalRService = inject(VideoChatService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    if (!this.authService.getAccessToken()) return ;
    this.signalRService.startConnection();
    this.startOfferReceive();
  }

 private startOfferReceive() {
    this.signalRService.offerReceived.subscribe(async (data) => {
        if (data) {
            let audio = new Audio('assets/mixkit-on-hold-ringtone-1361.wav');
            audio.play();
            
            const dialogRef = this.dialog.open(VideoChatComponent, {
                width: "400px",
                height: "600px",
                disableClose: false,
            });
            
            this.signalRService.remoteUserId = data.senderId;
            this.signalRService.incomingCall = true;
            
            // Ensure the component is initialized
            dialogRef.afterOpened().subscribe(() => {
                // The component will handle the offer through the offerReceived observable
            });
        }
    });
}
}
