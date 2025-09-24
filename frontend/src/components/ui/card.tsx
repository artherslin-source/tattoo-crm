import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
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
      className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = "", ...props }) => {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};
