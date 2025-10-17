import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`rounded-lg border border-[var(--line)] bg-[var(--panel)] text-on-dark shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`p-6 pt-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = "", ...props }) => {
  return (
    <p
      className={`text-sm text-on-dark-subtle ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = "", ...props }) => {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight text-on-dark ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};
