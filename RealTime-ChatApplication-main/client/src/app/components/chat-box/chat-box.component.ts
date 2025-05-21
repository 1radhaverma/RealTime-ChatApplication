import { AfterViewChecked, Component, ElementRef, ViewChild, 
  ChangeDetectorRef, OnDestroy, DestroyRef, inject,  
  OnInit} from '@angular/core';
import { ChatService } from '../../services/chat.service';
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import { AuthService } from '../../services/auth.service';
import { DatePipe ,NgClass, NgIf, NgFor } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators'; 
import { Message } from '../../models/message';

@Component({
  selector: 'app-chat-box',
  imports: [MatProgressSpinner, DatePipe, MatIconModule],
  templateUrl: './chat-box.component.html',
  styles: [`
.chat-box {
      scroll-behavior: smooth;
      overflow: hidden;
      padding: 10px;
      background-color: #f5f5f5;
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      height: 70vh;
      border-radius: 5px;
      overflow-y: scroll;
    }
    .no-messages {
      animation: fadeIn 0.3s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .chat-box::-webkit-scrollbar {
      width: 5px;
      transition: width 0.3s;
    }
    .chat-box:hover::-webkit-scrollbar {
      width: 5px;
    }
    .chat-box::-webkit-scrollbar-track {
      background-color: transparent;
      border-radius: 10px;
    }
    .chat-box:hover::-webkit-scrollbar-thumb {
      background: gray;
      border-radius: 10px;
    }
    .chat-box::-webkit-scrollbar-thumb:hover {
      background: #555;
      border-radius: 10px;
    }
    .chat-icon {
      width: 40px;
      height: 40px;
      font-size: 48px;
    }
    .chat-message {
      transition: all 0.3s ease;
      transform-origin: bottom;
    }
    .chat-message.sent {
      animation: messageSent 0.3s ease-out;
    }
    .chat-message.received {
      animation: messageReceived 0.3s ease-out;
    }
    @keyframes messageSent {
      from { transform: translateX(20px) scale(0.9); opacity: 0; }
      to { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes messageReceived {
      from { transform: translateX(-20px) scale(0.9); opacity: 0; }
      to { transform: translateX(0) scale(1); opacity: 1; }
    }
    .date-separator {
      display: flex;
      align-items: center;
      margin: 1rem 0;
      color: #666;
      font-size: 0.8rem;
    }
    .date-separator::before,
    .date-separator::after {
      content: "";
      flex: 1;
      border-bottom: 1px solid #ddd;
      margin: 0 0.5rem;
    }
  `],
  standalone: true
})
export class ChatBoxComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatBox', { static: false }) chatBox?: ElementRef;
  private destroy$ = new Subject<void>();
  private scrollDebounce$ = new Subject<void>();

  constructor(
    public chatService: ChatService,
    public authService: AuthService,
    private cdRef: ChangeDetectorRef
  ) {
    this.scrollDebounce$.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isNearBottom()) {
        this.scrollToBottom('smooth');
      }
    });
  }

  ngOnInit() {
    this.chatService.chatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdRef.detectChanges();
        this.scrollDebounce$.next();
      });
  }

ngAfterViewChecked() {
    this.scrollDebounce$.next();
  }

   ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.scrollDebounce$.complete();
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const messages = this.chatService.chatMessages();
    if (index >= messages.length) return false;
    
    const currentDate = new Date(messages[index].createdDate).toDateString();
    const prevDate = new Date(messages[index - 1].createdDate).toDateString();
    return currentDate !== prevDate;
  }

  
  formatMessageDate(date: string): string {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }

   isUserTyping(): boolean {
    const currentChat = this.chatService.currentOpenedChat();
    if (!currentChat) return false;
    
    return this.chatService.onlineUsers().some(u => 
      u.userName === currentChat.userName && u.isTyping
    );
  }

  trackByMessageId(index: number, message: Message): number {
    return message.id || index;
  }

  isConsecutiveMessage(index: number): boolean {
    const messages = this.chatService.chatMessages();
    if (index === 0 || index >= messages.length) return false;
    
    const prevMsg = messages[index - 1];
    const currentMsg = messages[index];
    
    return (
      prevMsg.senderId === currentMsg.senderId &&
      new Date(currentMsg.createdDate).getTime() - new Date(prevMsg.createdDate).getTime() < 60000
    );
  }

  private isNearBottom(threshold = 100): boolean {
    if (!this.chatBox?.nativeElement) return true;
    const element = this.chatBox.nativeElement;
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }

   scrollToBottom(behavior: ScrollBehavior = 'auto'): void {
    setTimeout(() => {
      if (this.chatBox?.nativeElement) {
        const element = this.chatBox.nativeElement;
        element.scrollTo({
          top: element.scrollHeight,
          behavior: behavior
        });
      }
    }, 0);
  }
}