// components/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div 
      className={`bg-gray-200 animate-pulse rounded ${className}`}
      style={style}
    />
  );
};
