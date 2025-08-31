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
    <div className="flex flex-col h-[100dvh] safe-area-bottom transition-colors duration-300"
         style={{
           background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-50, var(--primary-100)) 100%)'
         }}>
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
            messageElement.classList.add('border-l-4', 'shadow-md');
            messageElement.style.backgroundColor = 'var(--primary-100)';
            messageElement.style.borderLeftColor = 'var(--primary-500)';
            messageElement.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            setTimeout(() => {
              messageElement.classList.remove('border-l-4', 'shadow-md');
              messageElement.style.backgroundColor = '';
              messageElement.style.borderLeftColor = '';
              messageElement.style.boxShadow = '';
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
            messageElement.classList.add('border-l-4', 'shadow-md');
            messageElement.style.backgroundColor = 'var(--primary-100)';
            messageElement.style.borderLeftColor = 'var(--primary-500)';
            messageElement.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            setTimeout(() => {
              messageElement.classList.remove('border-l-4', 'shadow-md');
              messageElement.style.backgroundColor = '';
              messageElement.style.borderLeftColor = '';
              messageElement.style.boxShadow = '';
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