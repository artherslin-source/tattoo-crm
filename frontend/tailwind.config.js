/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background & Surface
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'card-bg': 'var(--color-card-bg)',
        panel: 'var(--color-panel)',
        
        // Text Colors
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-on-primary': 'var(--color-text-on-primary)',
        
        // Borders
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        'border-strong': 'var(--color-border-strong)',
        
        // Primary & Accent
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-active': 'var(--color-primary-active)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-active': 'var(--color-accent-active)',
        
        // Semantic Colors
        success: 'var(--color-success)',
        'success-bg': 'var(--color-success-bg)',
        'success-text': 'var(--color-success-text)',
        warning: 'var(--color-warning)',
        'warning-bg': 'var(--color-warning-bg)',
        'warning-text': 'var(--color-warning-text)',
        error: 'var(--color-error)',
        'error-bg': 'var(--color-error-bg)',
        'error-text': 'var(--color-error-text)',
        info: 'var(--color-info)',
        'info-bg': 'var(--color-info-bg)',
        'info-text': 'var(--color-info-text)',
        
        // Input Elements
        'input-bg': 'var(--color-input-bg)',
        'input-text': 'var(--color-input-text)',
        'input-border': 'var(--color-input-border)',
        'input-focus': 'var(--color-input-focus)',
        'input-placeholder': 'var(--color-input-placeholder)',
        
        // Button Elements
        'button-text': 'var(--color-button-text)',
        'button-secondary-bg': 'var(--color-button-secondary-bg)',
        'button-secondary-text': 'var(--color-button-secondary-text)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--border-radius-sm)',
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
        xl: 'var(--border-radius-xl)',
        full: 'var(--border-radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
}

