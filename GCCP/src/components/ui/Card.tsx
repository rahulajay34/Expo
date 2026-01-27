import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'bordered';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ 
  children, 
  variant = 'default', 
  hover = false,
  padding = 'md',
  className, 
  ...props 
}: CardProps) {
  const variants = {
    default: 'bg-white border border-zinc-200',
    subtle: 'bg-zinc-50/50',
    bordered: 'bg-white border border-zinc-200'
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div
      className={clsx(
        'rounded-md',
        variants[variant],
        paddings[padding],
        hover && 'transition-colors hover:bg-zinc-50/50 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div 
      className={clsx('pb-3 border-b border-zinc-200/60', className)} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: CardBodyProps) {
  return (
    <div className={clsx('py-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div 
      className={clsx('pt-3 border-t border-zinc-200/60', className)} 
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
