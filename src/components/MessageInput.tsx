import React, { useState, KeyboardEvent } from 'react';
import { useSocket } from '../contexts/SocketContext';
import './MessageInput.css';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const { isConnected } = useSocket();

  const handleSubmit = () => {
    if (message.trim() && isConnected) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="メッセージを入力..."
          className="message-input"
          rows={1}
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim()}
          className="send-button"
        >
          📤
        </button>
      </div>
    </div>
  );
};

export default MessageInput; 