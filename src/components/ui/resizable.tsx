
"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ResizableProps {
  children: React.ReactNode;
  width?: number;
  onResize: (width: number) => void;
  className?: string;
}

export const Resizable = ({ children, width, onResize, className }: ResizableProps) => {
  const headRef = useRef<HTMLTableCellElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = headRef.current?.offsetWidth || 0;
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const delta = e.clientX - startX.current;
      const newWidth = startWidth.current + delta;
      onResize(newWidth);
    }
  }, [onResize]);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  return (
    <TableHead 
      ref={headRef} 
      className={cn("relative group", className)}
      style={{ flex: `1 1 ${width}px` }}
    >
      <div className="flex items-center h-full">
        {children}
      </div>
      <div
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        <div className="w-px h-1/2 bg-border group-hover:bg-ring transition-colors" />
      </div>
    </TableHead>
  );
};
