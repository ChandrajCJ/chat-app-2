export type User = '🐞' | '🦎';

export type ReactionType = string; // Allow any emoji string for reactions

export interface MessageHistory {
  text: string;
  editedAt: Date;
}

export interface Message {
  id: string;
  text: string; // Supports markdown formatting
  sender: User;
  timestamp: Date;
  delivered?: boolean; // Message reached recipient's device/browser
  deliveredAt?: Date; // When the message was delivered
  read?: boolean; // Message read by recipient (only when online)
  readAt?: Date; // When the message was read
  replyTo?: {
    id: string;
    text: string;
    sender: User;
  };
  edited?: boolean;
  editHistory?: MessageHistory[]; // Array of previous versions with timestamps
  voiceUrl?: string;
  reaction?: ReactionType; // Single reaction per message
  isPinned?: boolean; // Whether message is pinned
  pinnedBy?: User; // Who pinned the message
  pinnedAt?: Date; // When message was pinned
}

// Draft message interface
export interface Draft {
  id: string; // Draft ID (user-specific)
  user: User; // Who created the draft
  text: string; // Draft text content
  replyTo?: {
    id: string;
    text: string;
    sender: User;
  };
  lastUpdated: Date; // When draft was last modified
  createdAt: Date; // When draft was created
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

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ScheduledMessage {
  id: string;
  text: string;
  sender: User;
  scheduledDate: Date;
  scheduledTime: string; // Format: "HH:MM"
  recurrence: RecurrenceType;
  selectedDays?: DayOfWeek[]; // For custom recurrence - which days to send
  createdAt: Date;
  sent: boolean;
  enabled: boolean; // Whether the scheduled message is active
  replyTo?: {
    id: string;
    text: string;
    sender: User;
  };
}

export interface LoginInfo {
  id: string;
  user: User;
  timestamp: Date;
  device: string; // Device type (e.g., "MacBook Pro", "iPhone 14", "Windows PC")
  browser: string; // Browser name and version
  os: string; // Operating system
  location?: {
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
  };
  ipAddress?: string;
  loginMethod: 'pin' | 'biometric';
  success: boolean;
}