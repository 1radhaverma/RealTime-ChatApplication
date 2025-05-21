import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBoxComponent } from "../chat-box/chat-box.component";
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoChatService } from '../../services/video-chat.service';
import { VideoChatComponent } from '../../video-chat/video-chat.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIconModule, FormsModule, ChatBoxComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.css'
})
export class ChatWindowComponent {
  @ViewChild('chatBox') chatContainer?:ElementRef;
  dialog= inject(MatDialog);
  chatService = inject(ChatService);
  VideoChatService = inject(VideoChatService);
  message: string = '';
  private snackBar = inject(MatSnackBar);
   showVideoChat = false;
 
sendMessage() {
  if (!this.message|| this.message.trim() === '') { this.showError('Message cannot be empty');
    return;}
    if (!this.chatService.currentOpenedChat()) {
      this.showError('No conversation selected');
      return;
    }
  this.chatService.sendMessage(this.message);
  this.message = '';
  this.scrollToBottom();
}
startVideoCall() {
    const currentChat = this.chatService.currentOpenedChat();
    if (!currentChat) return;

    this.dialog.open(VideoChatComponent, {
      width: '70vw',
      height: '70vh',
      maxWidth: '900px',
      panelClass: 'video-chat-dialog',
      data: {
        remoteUserId: currentChat.userName,
        remoteUserName: currentChat.fullName,
        isIncomingCall: false
      }
    });
  }

private scrollToBottom(){
  setTimeout(() => {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = 
        this.chatContainer.nativeElement.scrollHeight;
    }
  }, 100);
}
private showError(message: string) {
  this.snackBar.open(message, 'Dismiss', {
    duration: 3000,
    panelClass: ['error-snackbar']
  });
}
displayDialog(receiverId:string){
this.VideoChatService.remoteUserId = receiverId;

this.dialog.open(VideoChatComponent,{
  width:"400px",
  height:"600px",
  disableClose:true,
  autoFocus:false
})
}
}

