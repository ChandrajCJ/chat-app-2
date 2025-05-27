import React, { useState } from 'react';
import { User, Message, ReactionType } from '../types';
import { useChat } from '../hooks/useChat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatContainerProps {
  currentUser: User;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ currentUser }) => {
  const { 
    messages, 
    sendMessage, 
    loading, 
    userStatuses,
    editMessage,
    deleteMessage,
    deleteAllMessages,
    sendVoiceMessage,
    reactToMessage,
    removeReaction
  } = useChat(currentUser);
  const [replyingTo, setReplyingTo] = useState<Message | undefined>();

  const handleSendMessage = (text: string, replyTo?: Message) => {
    sendMessage(text, replyTo);
    setReplyingTo(undefined);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-900 safe-area-bottom">
      <ChatHeader 
        currentUser={currentUser} 
        userStatuses={userStatuses}
        onDeleteAll={deleteAllMessages}
      />
      
      <MessageList 
        messages={messages} 
        currentUser={currentUser}
        loading={loading}
        onReply={handleReply}
        onEdit={editMessage}
        onDelete={deleteMessage}
        onReact={reactToMessage}
        onRemoveReaction={removeReaction}
      />
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        onSendVoice={sendVoiceMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(undefined)}
      />
    </div>
  );
};

export default ChatContainer;