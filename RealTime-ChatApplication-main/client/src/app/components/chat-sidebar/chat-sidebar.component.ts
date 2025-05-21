import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../models/User';
import { ChatService } from '../../services/chat.service';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { TypingIndicatorComponent } from "../typing-indicator/typing-indicator.component";
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [
    MatIconModule, 
    MatMenuModule, 
    TitleCasePipe, 
    TypingIndicatorComponent,
    MatButtonModule,
    FormsModule,
    CommonModule
  ],
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.css']
})
export class ChatSidebarComponent implements OnInit {
  authService = inject(AuthService);
  chatService = inject(ChatService);
  router = inject(Router);
  searchQuery = '';

  ngOnInit(): void {
    const token = this.authService.getAccessToken();
    if (token) {
      this.chatService.startConnection(token);
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    this.authService.logout();
    this.chatService.disconnectConnection();
    this.router.navigate(['/login']);
  }

  openChatWindow(user: User) {
    // Clear any existing typing indicators
    this.chatService.onlineUsers.update(users => 
      users.map(u => ({...u, isTyping: false}))
    );
    
    // Set the new chat and load messages
    this.chatService.setCurrentChat(user);
  }

  filterUsers(): User[] {
    return this.chatService.onlineUsers().filter(user => 
      user.fullName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      user.userName.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  getUserStatus(user: User): string {
    if (user.isTyping) return 'typing';
    return user.isOnline ? 'online' : 'offline';
  }
}