import { AfterViewChecked, Component, ElementRef, ViewChild, 
  ChangeDetectorRef, OnDestroy, DestroyRef, inject  } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import { AuthService } from '../../services/auth.service';
import { DatePipe ,NgClass, NgIf, NgFor } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators'; 

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
    .chat-box {
      height: 70vh;
      overflow-y: auto;
      scroll-behavior: smooth;
    }
  `],
  standalone: true
})
export class ChatBoxComponent implements AfterViewChecked , OnDestroy {
  private destroyRef = inject(DestroyRef); // <-- Add this
  private destroy$ = new Subject<void>();
@ViewChild('chatBox',{read:ElementRef}) public chatBox?:ElementRef;   

constructor(
  public chatService: ChatService,
  public authService: AuthService,
  private cdRef: ChangeDetectorRef,
) {  this.chatService.currentOpenedChat$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(() => {
    this.scrollToBottom();
  });

  this.chatService.chatMessages$
  .pipe(takeUntilDestroyed(this.destroyRef)) 
  .subscribe(() => {
    if (this.isNearBottom()) {
      this.scrollToBottom();
    }
  });
}
private isNearBottom(threshold = 100): boolean {
  if (!this.chatBox?.nativeElement) return true;
  const element = this.chatBox.nativeElement;
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
}
ngOnInit() {
  this.chatService.currentOpenedChat$
  .pipe(takeUntil(this.destroy$)) 
    .subscribe((user) => {
      if (user) {
        // Scroll to bottom when chat changes
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
}
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

ngAfterViewChecked(): void {
  this.scrollToBottom();
  this.cdRef.detectChanges();
}

scrollToBottom(behavior: ScrollBehavior = 'auto') {
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