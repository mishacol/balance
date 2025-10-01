import React from 'react';

interface EmojiReactionProps {
  type: 'happy' | 'neutral' | 'sad';
  size?: number;
}

export const EmojiReaction: React.FC<EmojiReactionProps> = ({ type, size = 24 }) => {
  const getEmoji = () => {
    switch (type) {
      case 'happy':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="#FFD93D" stroke="#333" strokeWidth="2"/>
            <circle cx="38" cy="42" r="4" fill="#333"/>
            <circle cx="62" cy="42" r="4" fill="#333"/>
            <path d="M 32 58 Q 50 68 68 58" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </svg>
        );
      case 'neutral':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="#FFD93D" stroke="#333" strokeWidth="2"/>
            <circle cx="38" cy="42" r="4" fill="#333"/>
            <circle cx="62" cy="42" r="4" fill="#333"/>
            <line x1="32" y1="62" x2="68" y2="62" stroke="#333" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        );
      case 'sad':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="#FFD93D" stroke="#333" strokeWidth="2"/>
            <circle cx="38" cy="42" r="4" fill="#333"/>
            <circle cx="62" cy="42" r="4" fill="#333"/>
            <path d="M 32 65 Q 50 55 68 65" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return <div className="flex items-center justify-center">{getEmoji()}</div>;
};
