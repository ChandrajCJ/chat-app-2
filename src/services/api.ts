import io from 'socket.io-client';

const API_BASE_URL = 'http://localhost:3001';

// Socket.io connection
export const socket = io(API_BASE_URL);

// API functions
export const api = {
  // Get all messages
  getMessages: async () => {
    const response = await fetch(`${API_BASE_URL}/api/messages`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },

  // Delete all messages
  deleteAllMessages: async () => {
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete messages');
    return response.json();
  },

  // Get user statuses
  getUserStatuses: async () => {
    const response = await fetch(`${API_BASE_URL}/api/user-statuses`);
    if (!response.ok) throw new Error('Failed to fetch user statuses');
    return response.json();
  },

  // Upload voice message
  uploadVoiceMessage: async (blob: Blob, sender: string) => {
    const formData = new FormData();
    formData.append('voice', blob, 'voice.webm');
    formData.append('sender', sender);

    const response = await fetch(`${API_BASE_URL}/api/upload-voice`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Failed to upload voice message');
    return response.json();
  }
};