import React, { useRef, useEffect } from 'react';
import './MessageList.css';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  timestamp: string | Date;
  avatar?: string;
}

interface MessageListProps {
  messages: Message[];
  currentUser: User;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUser }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string | Date) => {
    const today = new Date();
    const messageDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    if (messageDate.toDateString() === today.toDateString()) {
      return '今日';
    } else if (messageDate.toDateString() === new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString()) {
      return '昨日';
    } else {
      return messageDate.toLocaleDateString('ja-JP');
    }
  };

  return (
    <div className="message-list">
      {messages.map((message, index) => {
        const isOwnMessage = message.userId === currentUser.id;
        const showDate = index === 0 || 
          formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

        return (
          <div key={message.id}>
            {showDate && (
              <div className="date-separator">
                <span>{formatDate(message.timestamp)}</span>
              </div>
            )}
            <div className={`message ${isOwnMessage ? 'own-message' : ''}`}>
              <div className="message-avatar">
                {message.avatar ? (
                  <img src={message.avatar} alt={message.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {message.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-username">{message.username}</span>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
                <div className="message-text">{message.content}</div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 