import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "destructive" | "ghost" | "reserve";
  size?: "default" | "sm" | "lg";
};

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = "default",
  size = "default",
  className = "",
  ...props 
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variantClasses = {
    default:
      "bg-primary text-button-text shadow-sm hover:bg-primary-hover active:bg-primary-active active:scale-95 focus:ring-primary/50",
    outline:
      "border border-border bg-bg text-text-secondary hover:bg-surface active:scale-95 focus:ring-primary/40",
    destructive:
      "bg-error text-button-text hover:opacity-90 active:opacity-80 active:scale-95 focus:ring-error/60",
    ghost:
      "text-text-secondary hover:bg-surface active:bg-border-light active:scale-95 focus:ring-primary/30",
    reserve:
      "bg-accent text-button-text shadow-sm hover:bg-accent-hover active:bg-accent-active active:scale-95 focus:ring-accent/50",
  };
  
  const sizeClasses = {
    // iPad: slightly larger touch targets + font for comfort
    default: "px-4 py-2 text-sm ipad:px-5 ipad:py-3 ipad:text-base ipad:min-h-[44px]",
    sm: "px-3 py-1.5 text-sm ipad:px-4 ipad:py-2.5 ipad:text-base ipad:min-h-[44px]",
    lg: "px-6 py-3 text-base ipad:px-7 ipad:py-3.5 ipad:text-lg ipad:min-h-[48px]"
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <button
      {...props}
      className={classes}
    >
      {children}
    </button>
  );
};
