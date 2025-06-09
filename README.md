# MongoDB Chat Application

A real-time chat application built with React, Node.js, Socket.io, and MongoDB Atlas.

## Features

- Real-time messaging with Socket.io
- Voice messages with GridFS storage
- Message reactions and replies
- Typing indicators
- User online/offline status
- Message editing and deletion
- Responsive design

## Setup Instructions

### 1. MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster (free tier is sufficient)

2. **Configure Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a user with username and password
   - Give the user "Read and write to any database" permissions

3. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Add your current IP address or use `0.0.0.0/0` for development (not recommended for production)

4. **Get Connection String**
   - Go to "Clusters" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your preferred database name (e.g., `chatapp`)

### 2. Environment Setup

1. **Create Environment File**
   ```bash
   cp .env.example .env
   ```

2. **Update .env file**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp?retryWrites=true&w=majority
   PORT=3001
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

This will start both the frontend (port 5173) and backend (port 3001) concurrently.

## Project Structure

```
├── server/
│   └── index.js          # Express server with Socket.io
├── src/
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and Socket.io client
│   └── types/           # TypeScript type definitions
├── .env                 # Environment variables
└── package.json         # Dependencies and scripts
```

## API Endpoints

- `GET /api/messages` - Get all messages
- `DELETE /api/messages` - Delete all messages
- `GET /api/user-statuses` - Get user statuses
- `POST /api/upload-voice` - Upload voice message
- `GET /api/voice/:id` - Serve voice message

## Socket.io Events

### Client to Server
- `user-login` - User connects
- `typing` - User typing status
- `send-message` - Send new message
- `edit-message` - Edit existing message
- `delete-message` - Delete message
- `react-to-message` - Add reaction
- `remove-reaction` - Remove reaction
- `mark-as-read` - Mark message as read

### Server to Client
- `new-message` - New message received
- `message-edited` - Message was edited
- `message-deleted` - Message was deleted
- `message-reaction` - Message reaction updated
- `message-read` - Message marked as read
- `user-statuses` - User status updates
- `user-typing` - User typing status
- `all-messages-deleted` - All messages deleted

## Database Schema

### Messages Collection
```javascript
{
  _id: ObjectId,
  text: String,
  sender: String, // '🐞' or '🦎'
  timestamp: Date,
  read: Boolean,
  replyTo: {
    id: String,
    text: String,
    sender: String
  },
  edited: Boolean,
  voiceUrl: String,
  reaction: String // emoji
}
```

### UserStatus Collection
```javascript
{
  _id: ObjectId,
  userId: String, // '🐞' or '🦎'
  lastSeen: Date,
  isOnline: Boolean,
  isTyping: Boolean
}
```

### Voice Messages (GridFS)
Voice messages are stored using MongoDB GridFS in the `voiceMessages` bucket.

## Development Notes

- The app uses Socket.io for real-time communication
- Voice messages are stored in MongoDB GridFS
- User authentication is simplified with PIN-based login
- The frontend proxies API requests to the backend during development