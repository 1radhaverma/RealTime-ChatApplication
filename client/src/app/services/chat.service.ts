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

  // Cache management
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

validateCacheForUser(userId: string) {
  const cached = this.messageCache.get(userId);
  if (cached) {
    // Remove any messages that don't belong to this chat
    const validMessages = cached.filter(msg => 
      (msg.senderId === userId || msg.receiverId === userId) &&
      (msg.senderId === this.authService.currentLoggedUser?.id || 
       msg.receiverId === this.authService.currentLoggedUser?.id)
    );
    this.messageCache.set(userId, validMessages);
  }
}
 private saveCacheToStorage() {
    localStorage.setItem(
      'chatMessageCache',
      JSON.stringify(Array.from(this.messageCache.entries())))
  }

  // Chat management
  setCurrentChat(user: User | null) {
    // Save current messages before switching
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
    // Load from cache first
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
    async loadAllMessages(userId: string): Promise<void> {
    if (!userId || !this.hubConnection) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    try {
      const messages = await this.hubConnection.invoke<Message[]>('LoadAllMessages', userId);
      const validMessages = messages.filter(msg => 
        msg.id && !this.loadedMessageIds.has(msg.id)
      );

      validMessages.forEach(msg => this.loadedMessageIds.add(msg.id));
      this.chatMessages.set(validMessages);
      this.cacheMessages(userId, validMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
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

  // SignalR connection methods
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
    
    this.hubConnection.on("ReceiveMessageList", (message) => {
      this.chatMessages.update(messages => [...message.messages, ...messages]);
      this.chatMessagesSubject.next();
      this.isLoading.set(false);
    });

    this.hubConnection.on("ReceiveMessage", (message: Message) => {
      if (!this.loadedMessageIds.has(message.id)) {
        this.loadedMessageIds.add(message.id);
        this.chatMessages.update(messages => [...messages, message]);
        this.chatMessagesSubject.next();
      }
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

  // Message methods
  sendMessage(message: string) {
    const newMessage = {
      content: message,
      senderId: this.authService.currentLoggedUser!.id,
      receiverId: this.currentOpenedChat()?.id!,
      createdDate: new Date().toString(),
      isRead: false,
      id: 0,
    };

    this.chatMessages.update(messages => [...messages, newMessage]);
  
    this.hubConnection?.invoke('SendMessage', {
      receiverId: this.currentOpenedChat()?.id,
      content: message,
    }).catch(error => console.log('Send error:', error));
  }

  // Status methods
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