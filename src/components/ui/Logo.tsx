import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradients */}
      <defs>
        <radialGradient id="goldGradient" cx="30%" cy="30%">
          <stop offset="0%" style={{stopColor:"#FFE84D", stopOpacity:0.4}}/>
          <stop offset="50%" style={{stopColor:"#FFD700", stopOpacity:0.3}}/>
          <stop offset="100%" style={{stopColor:"#DAA520", stopOpacity:0.5}}/>
        </radialGradient>
      </defs>
      
      {/* Bottom Coin (Gold) */}
      <g transform="translate(100, 150)">
        {/* Coin shadow */}
        <ellipse cx="0" cy="8" rx="32" ry="8" fill="rgba(0,0,0,0.2)"/>
        
        {/* Main coin body */}
        <circle cx="0" cy="0" r="32" fill="#FFD700"/>
        <circle cx="0" cy="0" r="32" fill="url(#goldGradient)"/>
        
        {/* Inner circle detail */}
        <circle cx="0" cy="0" r="26" fill="none" stroke="#FFA500" strokeWidth="1.5"/>
        
        {/* Center symbol */}
        <text x="0" y="8" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#FFA500" fontFamily="Arial, sans-serif">$</text>
      </g>
      
      {/* Middle Coin (Gold) - offset left and up */}
      <g transform="translate(80, 110)">
        {/* Coin shadow */}
        <ellipse cx="0" cy="8" rx="32" ry="8" fill="rgba(0,0,0,0.15)"/>
        
        {/* Main coin body */}
        <circle cx="0" cy="0" r="32" fill="#FFD700"/>
        <circle cx="0" cy="0" r="32" fill="url(#goldGradient)"/>
        
        {/* Inner circle detail */}
        <circle cx="0" cy="0" r="26" fill="none" stroke="#FFA500" strokeWidth="1.5"/>
        
        {/* Center symbol */}
        <text x="0" y="8" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#FFA500" fontFamily="Arial, sans-serif">$</text>
      </g>
      
      {/* Top Coin (Gold) - offset right and up more */}
      <g transform="translate(120, 70)">
        {/* Coin shadow */}
        <ellipse cx="0" cy="8" rx="32" ry="8" fill="rgba(0,0,0,0.1)"/>
        
        {/* Main coin body */}
        <circle cx="0" cy="0" r="32" fill="#FFD700"/>
        <circle cx="0" cy="0" r="32" fill="url(#goldGradient)"/>
        
        {/* Inner circle detail */}
        <circle cx="0" cy="0" r="26" fill="none" stroke="#FFA500" strokeWidth="1.5"/>
        
        {/* Center symbol */}
        <text x="0" y="8" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#FFA500" fontFamily="Arial, sans-serif">$</text>
      </g>
    </svg>
  );
};
