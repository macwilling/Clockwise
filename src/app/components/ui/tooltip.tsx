import React, { createContext, useContext, useState, useEffect } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from './utils';

interface TooltipProps {
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TooltipContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  setContent: (v: React.ReactNode) => void;
} | null>(null);

export const TooltipProvider = ({
  children,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) => <>{children}</>;

export const TooltipTrigger = ({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) => {
  const ctx = useContext(TooltipContext);
  const Comp = asChild ? Slot : 'span';
  if (!ctx) return <Comp>{children}</Comp>;
  return (
    <Comp
      onMouseEnter={() => ctx.setOpen(true)}
      onMouseLeave={() => ctx.setOpen(false)}
    >
      {children}
    </Comp>
  );
};

export interface TooltipContentProps {
  children?: React.ReactNode;
  content?: React.ReactNode;
  side?: string;
  align?: string;
  hidden?: boolean;
  className?: string;
}

export const TooltipContent = ({
  children,
  content,
  hidden,
}: TooltipContentProps) => {
  const ctx = useContext(TooltipContext);
  const value = content ?? children;
  useEffect(() => {
    if (!hidden && ctx) ctx.setContent(value ?? null);
    return () => {
      if (ctx) ctx.setContent(null);
    };
  }, [hidden, value, ctx]);
  return null;
};

export const Tooltip = ({ content: contentProp, children, className }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [content, setContent] = useState<React.ReactNode>(null);
  const resolvedContent = contentProp ?? content;

  const triggerChild = React.Children.toArray(children).find(
    (child): child is React.ReactElement => React.isValidElement(child) && (child.type as React.ComponentType)?.displayName === 'TooltipTrigger'
  );
  const contentChild = React.Children.toArray(children).find(
    (child): child is React.ReactElement => React.isValidElement(child) && (child.type as React.ComponentType)?.displayName === 'TooltipContent'
  );

  const isCompound = triggerChild != null && contentChild != null;

  if (isCompound) {
    return (
      <TooltipContext.Provider value={{ open: isVisible, setOpen: setIsVisible, setContent }}>
        {contentChild}
        <div
          className="relative inline-block"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {triggerChild}
          {isVisible && resolvedContent != null && (
            <div
              className={cn(
                'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap',
                'bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none',
                className
              )}
            >
              {resolvedContent}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      </TooltipContext.Provider>
    );
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && resolvedContent != null && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap',
            'bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none',
            className
          )}
        >
          {resolvedContent}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};
TooltipTrigger.displayName = 'TooltipTrigger';
TooltipContent.displayName = 'TooltipContent';
