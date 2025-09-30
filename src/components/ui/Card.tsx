import React from 'react';
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title
}) => {
  return <div className={`bg-surface border border-border rounded-lg p-4 ${className}`}>
      {title && <h3 className="text-white text-lg font-medium mb-3">{title}</h3>}
      {children}
    </div>;
};