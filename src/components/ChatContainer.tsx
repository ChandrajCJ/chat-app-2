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
    removeReaction,
    setTypingStatus
  } = useChat(currentUser);
  const [replyingTo, setReplyingTo] = useState<Message | undefined>();

  const otherUser = currentUser === '🐞' ? '🦎' : '🐞';
  const isOtherUserTyping = userStatuses[otherUser]?.isTyping || false;

  const handleSendMessage = (text: string, replyTo?: Message) => {
    sendMessage(text, replyTo);
    setReplyingTo(undefined);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-100 dark:bg-gray-950 safe-area-bottom transition-colors duration-300">
      <ChatHeader 
        currentUser={currentUser} 
        userStatuses={userStatuses}
        onDeleteAll={deleteAllMessages}
      />
      
      <MessageList 
        messages={messages} 
        currentUser={currentUser}
        loading={loading}
        isOtherUserTyping={isOtherUserTyping}
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
        onTyping={setTypingStatus}
      />
    </div>
  );
};

export default ChatContainer;