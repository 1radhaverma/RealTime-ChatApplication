import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { CommonModule, TitleCasePipe } from '@angular/common';


@Component({
  selector: 'app-chat-right-sidebar',
  imports: [TitleCasePipe , CommonModule],
  templateUrl: './chat-right-sidebar.component.html',
  styleUrl: './chat-right-sidebar.component.css'
})
export class ChatRightSidebarComponent {
 chatService = inject(ChatService);
}
