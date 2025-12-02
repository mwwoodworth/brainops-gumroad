/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React from 'react';

interface PopoverProps {
  children: React.ReactNode;
  content?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, content, open, onOpenChange }: PopoverProps) {
  return (
    <div className="relative inline-block">
      {children}
      {open && content && (
        <div className="absolute z-50 w-64 p-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
}

export function PopoverTrigger({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <div {...props}>{children}</div>;
}

export function PopoverContent({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <div {...props}>{children}</div>;
}