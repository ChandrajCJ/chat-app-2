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
    pagination,
    loadMoreMessages,
    loadMessagesUntil,
    loadAllMessagesForSearch,
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
        messages={messages}
        onDeleteAll={deleteAllMessages}
        onScrollToMessage={(messageId: string) => {
          // Find the message element and scroll to it
          const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight the message with dull, subtle background
            messageElement.classList.add('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
            setTimeout(() => {
              messageElement.classList.remove('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
            }, 3000);
          }
        }}
        onLoadAllMessages={loadAllMessagesForSearch}
        onLoadMessagesUntil={loadMessagesUntil}
      />
      
      <MessageList 
        messages={messages} 
        currentUser={currentUser}
        loading={loading}
        pagination={pagination}
        onLoadMore={loadMoreMessages}
        isOtherUserTyping={isOtherUserTyping}
        onReply={handleReply}
        onEdit={editMessage}
        onDelete={deleteMessage}
        onReact={reactToMessage}
        onRemoveReaction={removeReaction}
        onScrollToMessage={(messageId: string) => {
          // Find the message element and scroll to it
          const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight the message with dull, subtle background
            messageElement.classList.add('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
            setTimeout(() => {
              messageElement.classList.remove('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
            }, 3000);
          }
        }}
        onLoadMessagesUntil={loadMessagesUntil}
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