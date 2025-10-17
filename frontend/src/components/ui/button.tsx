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
      "bg-brand-blue text-white shadow-sm hover:bg-[#1E4FDB] active:bg-[#163FBB] active:scale-95 focus:ring-[#2563EB]/50",
    outline:
      "border border-gray-300 bg-white text-text-secondary-light hover:bg-gray-100 active:scale-95 focus:ring-[#2563EB]/40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-text-secondary-dark dark:hover:bg-neutral-700",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 active:scale-95 focus:ring-red-500/60",
    ghost:
      "text-text-secondary-light hover:bg-gray-100 active:bg-gray-200 active:scale-95 focus:ring-[#2563EB]/30 dark:text-text-secondary-dark dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
    reserve:
      "bg-brand-orange text-white shadow-sm hover:bg-[#FF8F33] active:bg-[#E56F00] active:scale-95 focus:ring-[#FF7A00]/50",
  };
  
  const sizeClasses = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3 text-base"
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
