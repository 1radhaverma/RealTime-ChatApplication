export interface Message {
    id: number;
    senderId: string;
    receiverId: string;
    content: string;
    createdDate: string; // ISO 8601 format
    isRead: boolean;

}
