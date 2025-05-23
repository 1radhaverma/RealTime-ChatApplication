import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { User } from '../models/User';
import { Message } from '../models/message';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
private authService = inject(AuthService); 
  private hubUrl = 'http://localhost:5000/hubs/chat';
  
  // Signals
  onlineUsers = signal<User[]>([]);
  currentOpenedChat = signal<User | null>(null);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);
  autoScrollEnabled = signal<boolean>(true);
  private pendingMessages = new Map<number, Message>(); 
  // Private properties
  private messageCache = new Map<string, Message[]>();
  private hubConnection?: HubConnection;
  private loadedMessageIds = new Set<number>();
  private chatMessagesSubject = new Subject<void>();
   private storageKey = 'chatMessages';
  private currentChatKey = 'currentChatId';

  // Observables
  currentOpenedChat$ = toObservable(this.currentOpenedChat);
  chatMessages$ = this.chatMessagesSubject.asObservable();

  constructor() {
   this.loadCacheFromStorage();
    this.setupConnection();
  }
  private setupConnection() {
    const token = this.authService.getAccessToken();
    if (token && this.authService.currentLoggedUser) {
      this.startConnection(token, this.authService.currentLoggedUser.id);
    }
  }
  getDisplayMessages(): Message[] {
  // Combine cached messages with pending messages that have been confirmed
  const dbMessages = this.chatMessages();
  const confirmedPending = Array.from(this.pendingMessages.values())
    .filter(msg => msg.status === 'confirmed');
  
  return [...dbMessages, ...confirmedPending];
}
 private loadCacheFromStorage() {
    const cache = localStorage.getItem('chatMessageCache');
    if (cache) {
      try {
        const parsed = JSON.parse(cache) as [string, Message[]][];
        this.messageCache = new Map(parsed);
      } catch (e) {
        console.error('Error parsing cache', e);
        this.messageCache = new Map();
      }
    }
  }
   async unsendMessage(messageId: number): Promise<void> {
  try {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      await this.hubConnection.invoke('UnsendMessage', messageId);
      
      // Update local state immediately
      this.chatMessages.update(messages => 
        messages.filter(msg => msg.id !== messageId)
      );
      
      // Update cache if needed
      const currentChatId = this.currentOpenedChat()?.id;
      if (currentChatId) {
        const cached = this.messageCache.get(currentChatId) || [];
        this.messageCache.set(
          currentChatId, 
          cached.filter(msg => msg.id !== messageId)
        );
        this.saveCacheToStorage();
      }
    }
  } catch (error) {
    console.error('Error unsending message:', error);
    throw error;
  }
}
  validateCacheForUser(userId: string) {
  const cached = this.messageCache.get(userId);
  if (cached) {
    // More lenient validation
    const validMessages = cached.filter(msg => 
      msg.content && msg.createdDate && 
      (msg.senderId === userId || msg.receiverId === userId)
    );
    this.messageCache.set(userId, validMessages);
  }
  }
  private saveCacheToStorage() {
    localStorage.setItem(
      'chatMessageCache',
      JSON.stringify(Array.from(this.messageCache.entries()))
    );
  }
  setCurrentChat(user: User | null) {
    const currentChat = this.currentOpenedChat();
    if (currentChat) {
      this.cacheMessages(currentChat.id, this.chatMessages());
    }

    this.currentOpenedChat.set(user);
    
    if (user) {
      localStorage.setItem('currentChatId', user.id);
      this.loadChatHistory(user.id);
    } else {
      localStorage.removeItem('currentChatId');
      this.chatMessages.set([]);
    }
  }
  private loadChatHistory(userId: string) {
    // Load from cache first for instant display
    const cached = this.messageCache.get(userId) || [];
    this.chatMessages.set(cached);
    this.chatMessagesSubject.next();
    
    // Then load from server
    this.loadAllMessages(userId).catch(err => {
      console.error('Failed to load messages:', err);
    });
  }
  private cacheMessages(userId: string, messages: Message[]) {
    const validMessages = messages.filter(msg => 
      msg.content && msg.createdDate
    );
    this.messageCache.set(userId, validMessages);
    this.saveCacheToStorage();
  }
 async loadAllMessages(userId: string, pageNumber: number = 1): Promise<void> {
    if (!userId || !this.hubConnection) {
        this.isLoading.set(false);
        return;
    }

    this.isLoading.set(true);

    try {
        // Call with both parameters
        const response = await this.hubConnection.invoke<{ messages: Message[] }>(
            'LoadMessages', 
            userId,
            pageNumber
        );

        if (response && response.messages) {
            const sortedMessages = response.messages.sort((a, b) => 
                new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
            );
            this.chatMessages.set(sortedMessages);
            this.cacheMessages(userId, sortedMessages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        // Add more detailed error handling
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
    } finally {
        this.isLoading.set(false);
    }
}
  restoreCurrentChat(availableUsers: User[]) {
    const chatId = localStorage.getItem('currentChatId');
    if (chatId) {
      const user = availableUsers.find(u => u.id === chatId);
      if (user) {
        this.setCurrentChat(user);
      }
    }
  }
  startConnection(token: string, senderId?: string) {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => console.log('Connection started'))
      .catch(error => console.log('Connection error', error));

    this.setupSignalREvents();
  }
  private setupSignalREvents() {
    if (!this.hubConnection) return;

    this.hubConnection.on('OnlineUsers', (users: User[]) => {
      this.onlineUsers.update(() => 
        users.filter(u => u.userName !== this.authService.currentLoggedUser?.userName)
      );
    });

    this.hubConnection.on("NotifyTypingtoUser", (senderUserName) => {
      if (this.currentOpenedChat()?.userName === senderUserName) {
        this.updateUserTypingStatus(senderUserName, true);
        
        setTimeout(() => {
          this.updateUserTypingStatus(senderUserName, false);
        }, 2000);
      }
    });
    
    this.hubConnection.on("ReceiveMessageList", (response: { messages: Message[] }) => {
      // Merge new messages with existing ones
      const mergedMessages = [...this.chatMessages(), ...response.messages];
      
      // Remove duplicates
      const uniqueMessages = mergedMessages.filter((msg, index, self) =>
        index === self.findIndex(m => 
          m.id === msg.id || 
          (m.content === msg.content && m.createdDate === msg.createdDate)
        )
      );
      
      // Sort by date
      const sortedMessages = uniqueMessages.sort((a, b) => 
        new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
      );

      this.chatMessages.set(sortedMessages);
      this.chatMessagesSubject.next();
      this.isLoading.set(false);
    });

    this.hubConnection.on("ReceiveMessage", (message: Message) => {
      this.chatMessages.update(messages => {
        // Check if message already exists
        const exists = messages.some(m => 
          m.id === message.id || 
          (m.content === message.content && m.createdDate === message.createdDate)
        );
        
        return exists ? messages : [...messages, message];
      });
      this.chatMessagesSubject.next();
    });
    this.hubConnection?.on("MessageDeleted", (messageId: number) => {
      this.chatMessages.update(messages => 
        messages.filter(msg => msg.id !== messageId)
      );
      this.chatMessagesSubject.next();
    });
  }
  

  private updateUserTypingStatus(userName: string, isTyping: boolean) {
    this.onlineUsers.update(users => 
      users.map(user => 
        user.userName === userName ? { ...user, isTyping } : user
      )
    );
  }
  disconnectConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop().catch(error => console.log(error));
    }
  }
  async sendMessage(content: string): Promise<void> {
  const tempId = Date.now();
  const newMessage: Message = {
    id: tempId,
    content,
    senderId: this.authService.currentLoggedUser!.id,
    receiverId: this.currentOpenedChat()?.id!,
    createdDate: new Date().toISOString(),
    isRead: false,
    status: 'pending' // Track message state
  };

  // Add to pending messages
  this.pendingMessages.set(tempId, newMessage);
  this.chatMessagesSubject.next();

  try {
    const response = await this.hubConnection?.invoke<{message: Message, tempId: number}>(
      'SendMessage', 
      {
        receiverId: this.currentOpenedChat()?.id,
        content,
        tempId
      }
    );

    if (response) {
      // Update status to confirmed and replace temp ID with real ID
      this.pendingMessages.set(tempId, {
        ...newMessage,
        id: response.message.id,
        status: 'confirmed'
      });
    }
  } catch (error) {
    // Mark as failed if sending fails
    this.pendingMessages.set(tempId, {
      ...newMessage,
      status: 'failed'
    });
  } finally {
    this.chatMessagesSubject.next();
  }
}
cleanUpFailedMessages() {
  // Remove messages that failed to send after some time
  Array.from(this.pendingMessages.entries()).forEach(([id, msg]) => {
    if (msg.status === 'failed') {
      setTimeout(() => {
        this.pendingMessages.delete(id);
        this.chatMessagesSubject.next();
      }, 5000); // Remove after 5 seconds
    }
  });
}
  status(userName: string): string {
    if (!this.currentOpenedChat()) return 'offline';

    const onlineUser = this.onlineUsers().find(u => u.userName === userName);
    return onlineUser?.isTyping ? 'Typing...' : this.isUserOnline();
  }
  isUserOnline(): string {
    const currentChat = this.currentOpenedChat();
    if (!currentChat) return 'offline';

    const onlineUser = this.onlineUsers().find(u => u.userName === currentChat.userName);
    return onlineUser?.isOnline ? 'online' : 'offline';
  }
  notifyTyping() {
    const currentChat = this.currentOpenedChat();
    if (!currentChat || !this.hubConnection) return;

    this.hubConnection.invoke('NotifyTyping', currentChat.userName)
      .catch(error => console.log('Typing error:', error));
  }
}