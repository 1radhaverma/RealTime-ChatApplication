import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatRightSidebarComponent } from './chat-right-sidebar.component';

describe('ChatRightSidebarComponent', () => {
  let component: ChatRightSidebarComponent;
  let fixture: ComponentFixture<ChatRightSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatRightSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatRightSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
