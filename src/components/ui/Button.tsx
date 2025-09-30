import React from 'react';
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  type = 'button',
  disabled = false
}) => {
  const baseClasses = 'rounded font-medium transition-all duration-200 focus:outline-none';
  const variantClasses = {
    primary: 'bg-highlight text-background hover:bg-opacity-80',
    secondary: 'bg-border-light text-white hover:bg-opacity-80',
    outline: 'bg-transparent border border-border-light text-white hover:border-highlight',
    danger: 'bg-expense text-white hover:bg-opacity-80'
  };
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3'
  };
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  return <button type={type} className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>;
};