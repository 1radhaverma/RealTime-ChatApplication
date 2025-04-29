import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBoxComponent } from "../chat-box/chat-box.component";
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIconModule, FormsModule, ChatBoxComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.css'
})
export class ChatWindowComponent {
  @ViewChild('chatBox') chatContainer?:ElementRef;
  chatService = inject(ChatService);
message: string = '';
private snackBar = inject(MatSnackBar);

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
}

