/**
 * WEATHERCRAFT ERP - GORGEOUS DESIGN SYSTEM
 * Modern, premium design system with customizable color schemes
 * Best practices: Visual hierarchy, accessibility, micro-interactions
 * Generated: October 8, 2025
 */

// COLOR SCHEME VARIANTS
export const colorSchemes = {
  purple: {
    name: 'Purple Dream',
    primary: '#9333ea', // purple-600
    secondary: '#a855f7', // purple-500
    tertiary: '#c084fc', // purple-400
    light: '#e9d5ff', // purple-200
    dark: '#7e22ce', // purple-700
    glow: 'rgba(147, 51, 234, 0.4)',
    gradient: {
      primary: 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
      subtle: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(192, 132, 252, 0.1) 100%)',
      hover: 'linear-gradient(135deg, #a855f7 0%, #d8b4fe 100%)',
    },
  },
  techGreen: {
    name: 'Deep Tech Green',
    primary: '#0d9488', // teal-600 - Deep tech green
    secondary: '#14b8a6', // teal-500 - Lighter tech green
    tertiary: '#5eead4', // teal-300 - Bright accent
    light: '#ccfbf1', // teal-100 - Light text
    dark: '#0f766e', // teal-700 - Darker pressed
    glow: 'rgba(13, 148, 136, 0.4)',
    gradient: {
      primary: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
      subtle: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
      hover: 'linear-gradient(135deg, #14b8a6 0%, #5eead4 100%)',
    },
  },
} as const;

// Set active color scheme here
export const ACTIVE_COLOR_SCHEME: keyof typeof colorSchemes = 'techGreen'; // Change to 'purple' or 'techGreen'

const activeScheme = colorSchemes[ACTIVE_COLOR_SCHEME];

export const designSystem = {
  // Color Palette - Premium Dark Theme with Active Brand
  colors: {
    // Background - Deep, sophisticated layers
    background: {
      primary: '#000000',
      secondary: '#0a0a0a',
      tertiary: '#141414',
      elevated: '#1a1a1a',
      card: '#18181b', // zinc-900
      modal: 'rgba(10, 10, 10, 0.95)',
    },

    // Brand - Active color scheme (CUSTOMIZABLE)
    brand: {
      primary: activeScheme.primary,
      secondary: activeScheme.secondary,
      tertiary: activeScheme.tertiary,
      light: activeScheme.light,
      dark: activeScheme.dark,
      glow: activeScheme.glow,
      gradient: activeScheme.gradient,
    },

    // Text hierarchy - Optimized for readability
    text: {
      primary: '#ffffff',
      secondary: '#e4e4e7', // zinc-200
      tertiary: '#a1a1aa', // zinc-400
      muted: '#71717a', // zinc-500
      disabled: '#52525b', // zinc-600
      inverse: '#18181b', // zinc-900
    },

    // Interactive states - Purple-based
    interactive: {
      hover: 'rgba(147, 51, 234, 0.08)',
      active: 'rgba(147, 51, 234, 0.15)',
      focus: 'rgba(147, 51, 234, 0.25)',
      border: 'rgba(147, 51, 234, 0.3)',
      disabled: 'rgba(255, 255, 255, 0.05)',
    },

    // Semantic colors - Keep emerald for success
    semantic: {
      success: '#10b981', // emerald-500
      successLight: '#d1fae5', // emerald-100
      warning: '#f59e0b', // amber-500
      warningLight: '#fef3c7', // amber-100
      error: '#ef4444', // red-500
      errorLight: '#fee2e2', // red-100
      info: '#71717a', // gray-500
      infoLight: '#e4e4e7', // gray-200
    },

    // Glass morphism - Enhanced
    glass: {
      light: 'rgba(255, 255, 255, 0.03)',
      medium: 'rgba(255, 255, 255, 0.06)',
      heavy: 'rgba(255, 255, 255, 0.10)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderHover: 'rgba(147, 51, 234, 0.3)',
      backdrop: 'rgba(0, 0, 0, 0.6)',
    },

    // Accent colors - Complementary palette
    accent: {
      cyan: '#06b6d4', // cyan-500 - Info, secondary actions
      emerald: '#10b981', // emerald-500 - Success states
      amber: '#f59e0b', // amber-500 - Warnings
      rose: '#f43f5e', // rose-500 - Destructive actions
      violet: '#8b5cf6', // violet-500 - Alternative accent
    },
  },

  // Typography - Clean, modern hierarchy
  typography: {
    fontFamily: {
      sans: 'var(--font-geist-sans)',
      mono: 'var(--font-geist-mono)',
    },

    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing - Consistent 4px base
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },

  // Border Radius - Subtle, modern
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    default: '0.5rem', // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
    full: '9999px',
  },

  // Shadows - Subtle depth
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(6, 182, 212, 0.3)',
  },

  // Animations - Smooth, professional
  animations: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },

    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Breakpoints - Mobile-first responsive
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Animation variants for Framer Motion
export const motionVariants = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25 },
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },

  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },

  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },

  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },

  // Stagger children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },

  // Button hover/tap
  button: {
    rest: { scale: 1 },
    hover: { scale: 1.02, transition: { duration: 0.15 } },
    tap: { scale: 0.98, transition: { duration: 0.15 } },
  },

  // Card hover
  card: {
    rest: { y: 0, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' },
    hover: {
      y: -4,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
    },
  },

  // Modal/Dialog
  modalBackdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25 },
  },

  modalContent: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },

  // Page transitions
  pageTransition: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

// Utility functions
export const utils = {
  // Glass morphism style generator
  glass: (intensity: 'light' | 'medium' | 'heavy' = 'medium') => ({
    backgroundColor: designSystem.colors.glass[intensity],
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${designSystem.colors.glass.border}`,
  }),

  // Glow effect generator
  glow: (color: string = designSystem.colors.accent.cyan, intensity: number = 0.3) => ({
    boxShadow: `0 0 20px rgba(${hexToRgb(color)}, ${intensity})`,
  }),

  // Gradient text
  gradientText: (from: string, to: string) => ({
    background: `linear-gradient(to right, ${from}, ${to})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }),
};

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}

// Component style presets - GORGEOUS MODERN DESIGN
export const componentStyles = {
  button: {
    // Primary - Bold purple gradient with glow
    primary: {
      base: `
        px-6 py-3 rounded-lg font-semibold
        bg-gradient-to-r from-purple-600 to-purple-500
        text-white
        shadow-lg shadow-purple-500/30
        hover:shadow-xl hover:shadow-purple-500/50
        hover:from-purple-500 hover:to-purple-400
        active:scale-[0.98]
        transition-all duration-200
        border border-purple-500/20
      `,
      icon: `
        p-2.5 rounded-lg
        bg-gradient-to-r from-purple-600 to-purple-500
        text-white
        shadow-md shadow-purple-500/30
        hover:shadow-lg hover:shadow-purple-500/50
        hover:from-purple-500 hover:to-purple-400
        active:scale-[0.95]
        transition-all duration-200
      `,
    },

    // Secondary - Glass with purple border
    secondary: {
      base: `
        px-6 py-3 rounded-lg font-medium
        bg-white/5 backdrop-blur-md
        border border-white/10
        text-zinc-200 hover:text-white
        hover:bg-purple-500/10 hover:border-purple-500/30
        active:scale-[0.98]
        transition-all duration-200
      `,
      icon: `
        p-2.5 rounded-lg
        bg-white/5 backdrop-blur-md
        border border-white/10
        text-zinc-300 hover:text-white
        hover:bg-purple-500/10 hover:border-purple-500/30
        active:scale-[0.95]
        transition-all duration-200
      `,
    },

    // Ghost - Minimal with purple hover
    ghost: {
      base: `
        px-6 py-3 rounded-lg font-medium
        text-zinc-300 hover:text-purple-300
        hover:bg-purple-500/10
        active:scale-[0.98]
        transition-all duration-200
      `,
      icon: `
        p-2.5 rounded-lg
        text-zinc-400 hover:text-purple-300
        hover:bg-purple-500/10
        active:scale-[0.95]
        transition-all duration-200
      `,
    },

    // Success - Emerald (keep for positive actions)
    success: {
      base: `
        px-6 py-3 rounded-lg font-semibold
        bg-gradient-to-r from-emerald-600 to-emerald-500
        text-white
        shadow-lg shadow-emerald-500/30
        hover:shadow-xl hover:shadow-emerald-500/50
        hover:from-emerald-500 hover:to-emerald-400
        active:scale-[0.98]
        transition-all duration-200
      `,
    },

    // Danger - Red for destructive actions
    danger: {
      base: `
        px-6 py-3 rounded-lg font-semibold
        bg-gradient-to-r from-red-600 to-red-500
        text-white
        shadow-lg shadow-red-500/30
        hover:shadow-xl hover:shadow-red-500/50
        hover:from-red-500 hover:to-red-400
        active:scale-[0.98]
        transition-all duration-200
      `,
    },
  },

  card: {
    // Base card - Subtle glass
    base: `
      bg-white/[0.03] backdrop-blur-md
      border border-white/[0.08]
      rounded-xl
      shadow-lg
      hover:border-purple-500/20 hover:bg-white/[0.06]
      hover:shadow-xl hover:shadow-purple-500/10
      transition-all duration-300
    `,

    // Elevated - More prominent
    elevated: `
      bg-white/[0.06] backdrop-blur-md
      border border-white/10
      rounded-xl
      shadow-xl shadow-black/20
      hover:border-purple-500/30 hover:bg-white/[0.08]
      hover:shadow-2xl hover:shadow-purple-500/20
      transition-all duration-300
    `,

    // Interactive - Purple accent on hover
    interactive: `
      bg-white/[0.03] backdrop-blur-md
      border border-white/[0.08]
      rounded-xl
      shadow-md
      hover:border-purple-500/40 hover:bg-purple-500/5
      hover:shadow-lg hover:shadow-purple-500/20
      cursor-pointer
      active:scale-[0.99]
      transition-all duration-200
    `,

    // Stat card - Purple gradient accent
    stat: `
      bg-gradient-to-br from-white/[0.06] to-white/[0.03]
      backdrop-blur-md
      border border-white/10
      rounded-xl
      shadow-lg
      hover:border-purple-500/30
      hover:shadow-xl hover:shadow-purple-500/10
      transition-all duration-300
    `,
  },

  input: {
    // Base input - Purple focus ring
    base: `
      w-full px-4 py-3
      bg-white/[0.03] backdrop-blur-md
      border border-white/10
      rounded-lg
      text-white placeholder-zinc-500
      focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
      focus:bg-white/[0.06]
      focus:outline-none
      transition-all duration-200
    `,

    // Large input
    large: `
      w-full px-5 py-4
      bg-white/[0.03] backdrop-blur-md
      border border-white/10
      rounded-xl
      text-lg text-white placeholder-zinc-500
      focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
      focus:bg-white/[0.06]
      focus:outline-none
      transition-all duration-200
    `,

    // With icon
    withIcon: `
      w-full pl-11 pr-4 py-3
      bg-white/[0.03] backdrop-blur-md
      border border-white/10
      rounded-lg
      text-white placeholder-zinc-500
      focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
      focus:bg-white/[0.06]
      focus:outline-none
      transition-all duration-200
    `,
  },

  badge: {
    // Status badges
    primary: `px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/30`,
    success: `px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30`,
    warning: `px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/30`,
    error: `px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 border border-red-500/30`,
    info: `px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30`,
    neutral: `px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-zinc-300 border border-white/20`,
  },
};

export default designSystem;
