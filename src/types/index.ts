export type User = '🐞' | '🦎';

export type ReactionType = string; // Allow any emoji string for reactions

export interface Message {
  id: string;
  text: string;
  sender: User;
  timestamp: Date;
  delivered?: boolean; // Message reached recipient's device/browser
  read?: boolean; // Message read by recipient (only when online)
  readAt?: Date; // When the message was read
  replyTo?: {
    id: string;
    text: string;
    sender: User;
  };
  edited?: boolean;
  voiceUrl?: string;
  reaction?: ReactionType;
}

export interface UserStatus {
  lastSeen: Date;
  isOnline: boolean;
  isTyping?: boolean;
}

export type UserStatuses = Record<User, UserStatus>;

export interface PaginationState {
  hasMore: boolean;
  isLoadingMore: boolean;
  lastVisible: any; // Firestore DocumentSnapshot
  totalLoaded: number;
}