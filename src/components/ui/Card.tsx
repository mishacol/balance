import React from 'react';
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  onClick
}) => {
  return <div 
      className={`bg-surface border border-border rounded-lg p-4 ${className}`}
      onClick={onClick}
    >
      {title && <h3 className="text-white text-lg font-medium mb-3">{title}</h3>}
      {children}
    </div>;
};