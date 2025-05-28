export type User = '🐞' | '🦎';

export type ReactionType = '🖤' | '👀' | '😭' | '🌚' | '🤣' | '👍';

export interface Message {
  id: string;
  text: string;
  sender: User;
  timestamp: Date;
  read?: boolean;
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