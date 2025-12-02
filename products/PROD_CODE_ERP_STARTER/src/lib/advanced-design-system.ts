/**
 * ADVANCED DESIGN SYSTEM - 2025 TOP-TIER UI/UX
 * Inspired by Linear, Vercel, Stripe, and Arc Browser
 * Implements cutting-edge visual trends
 */

/**
 * ADVANCED TYPOGRAPHY SYSTEM
 * Variable fonts, optical sizing, fluid typography
 */
export const advancedTypography = {
  // Fluid typography with viewport-based scaling
  fluid: {
    xs: 'clamp(0.694rem, 0.66rem + 0.17vw, 0.833rem)',     // 11.1-13.3px
    sm: 'clamp(0.833rem, 0.777rem + 0.28vw, 1rem)',         // 13.3-16px
    base: 'clamp(1rem, 0.913rem + 0.43vw, 1.2rem)',         // 16-19.2px
    lg: 'clamp(1.2rem, 1.074rem + 0.63vw, 1.44rem)',        // 19.2-23.04px
    xl: 'clamp(1.44rem, 1.263rem + 0.89vw, 1.728rem)',      // 23.04-27.65px
    '2xl': 'clamp(1.728rem, 1.484rem + 1.22vw, 2.074rem)',  // 27.65-33.18px
    '3xl': 'clamp(2.074rem, 1.744rem + 1.65vw, 2.488rem)',  // 33.18-39.81px
    '4xl': 'clamp(2.488rem, 2.05rem + 2.19vw, 2.986rem)',   // 39.81-47.78px
    '5xl': 'clamp(2.986rem, 2.409rem + 2.89vw, 3.583rem)',  // 47.78-57.33px
  },

  // Variable font settings
  variable: {
    weight: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    // Optical sizing for better readability
    opticalSize: {
      small: '8',
      medium: '14',
      large: '24',
      display: '48',
    },
  },

  // Letter spacing for premium feel
  tracking: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

/**
 * PROGRESSIVE BLUR SYSTEM
 * Multi-layer depth with advanced blur effects
 */
export const progressiveBlur = {
  layers: {
    // Surface layers with increasing blur
    surface1: {
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    surface2: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    surface3: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
    surface4: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
    },
    surface5: {
      background: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
    },
  },

  // Frosted glass effects
  frosted: {
    light: 'blur(8px) saturate(150%)',
    medium: 'blur(12px) saturate(180%)',
    heavy: 'blur(20px) saturate(200%)',
  },

  // Noise texture for organic feel
  noise: {
    subtle: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
  },
};

/**
 * MESH GRADIENTS
 * Complex, organic gradients for premium feel
 */
export const meshGradients = {
  primary: {
    background: `
      radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.15) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.12) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.1) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(6, 182, 212, 0.08) 0px, transparent 50%)
    `,
  },

  secondary: {
    background: `
      radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
      radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.06) 0%, transparent 40%)
    `,
  },

  ambient: {
    background: `
      conic-gradient(from 180deg at 50% 50%,
        rgba(6, 182, 212, 0.05) 0deg,
        rgba(59, 130, 246, 0.04) 120deg,
        rgba(139, 92, 246, 0.03) 240deg,
        rgba(6, 182, 212, 0.05) 360deg
      )
    `,
  },
};

/**
 * GLOW EFFECTS
 * Premium lighting and shadow system
 */
export const glowEffects = {
  // Ambient glow for buttons and interactive elements
  ambient: {
    cyan: {
      boxShadow: `
        0 0 20px rgba(6, 182, 212, 0.15),
        0 0 40px rgba(6, 182, 212, 0.1),
        0 0 60px rgba(6, 182, 212, 0.05)
      `,
    },
    blue: {
      boxShadow: `
        0 0 20px rgba(59, 130, 246, 0.15),
        0 0 40px rgba(59, 130, 246, 0.1),
        0 0 60px rgba(59, 130, 246, 0.05)
      `,
    },
    purple: {
      boxShadow: `
        0 0 20px rgba(139, 92, 246, 0.15),
        0 0 40px rgba(139, 92, 246, 0.1),
        0 0 60px rgba(139, 92, 246, 0.05)
      `,
    },
  },

  // Inner glow for depth
  inner: {
    subtle: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
    medium: 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.08)',
    strong: 'inset 0 4px 8px 0 rgba(255, 255, 255, 0.12)',
  },

  // Elevated shadow system
  elevation: {
    low: `
      0 1px 2px rgba(0, 0, 0, 0.1),
      0 1px 3px rgba(0, 0, 0, 0.05)
    `,
    medium: `
      0 4px 6px rgba(0, 0, 0, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.1)
    `,
    high: `
      0 10px 20px rgba(0, 0, 0, 0.2),
      0 4px 8px rgba(0, 0, 0, 0.15)
    `,
    ultra: `
      0 20px 40px rgba(0, 0, 0, 0.25),
      0 8px 16px rgba(0, 0, 0, 0.2)
    `,
  },
};

/**
 * ADVANCED ANIMATIONS
 * Sophisticated easing and transitions
 */
export const advancedAnimations = {
  // Custom easing curves (like Apple/Linear)
  easing: {
    // Entrance animations
    enter: 'cubic-bezier(0.22, 1, 0.36, 1)',      // Smooth enter
    enterSharp: 'cubic-bezier(0.4, 0, 0.2, 1)',   // Sharp enter

    // Exit animations
    exit: 'cubic-bezier(0.4, 0, 1, 1)',           // Smooth exit
    exitSharp: 'cubic-bezier(0.4, 0, 0.6, 1)',    // Sharp exit

    // Spring-like (Linear style)
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

    // Smooth, organic
    smooth: 'cubic-bezier(0.65, 0, 0.35, 1)',

    // Bouncy (for micro-interactions)
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Duration system
  duration: {
    instant: '100ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
    slowest: '750ms',
  },

  // Transition presets
  transitions: {
    smooth: 'all 250ms cubic-bezier(0.65, 0, 0.35, 1)',
    spring: 'all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    fade: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
    slide: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
    scale: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

/**
 * DEPTH LAYERS
 * Z-index and stacking context
 */
export const depthLayers = {
  base: 0,
  raised: 1,
  card: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  notification: 700,
  maximum: 999,
};

/**
 * ADVANCED INTERACTIVE STATES
 * Sophisticated hover, focus, and active states
 */
export const advancedStates = {
  interactive: {
    // Default state
    default: {
      transform: 'scale(1) translateY(0)',
      boxShadow: glowEffects.elevation.low,
      transition: advancedAnimations.transitions.spring,
    },

    // Hover state
    hover: {
      transform: 'scale(1.02) translateY(-2px)',
      boxShadow: glowEffects.elevation.medium,
      filter: 'brightness(1.1)',
    },

    // Active/pressed state
    active: {
      transform: 'scale(0.98) translateY(0)',
      boxShadow: glowEffects.elevation.low,
      filter: 'brightness(0.95)',
    },

    // Focus state (accessibility)
    focus: {
      outline: '2px solid rgba(6, 182, 212, 0.5)',
      outlineOffset: '2px',
      boxShadow: `
        ${glowEffects.elevation.medium},
        0 0 0 4px rgba(6, 182, 212, 0.1)
      `,
    },
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    filter: 'grayscale(0.5)',
  },
};

/**
 * Utility function to apply progressive blur
 */
export function applyProgressiveBlur(layer: keyof typeof progressiveBlur.layers) {
  return progressiveBlur.layers[layer];
}

/**
 * Utility function to apply mesh gradient
 */
export function applyMeshGradient(variant: keyof typeof meshGradients) {
  return meshGradients[variant];
}

/**
 * Utility function to apply glow effect
 */
export function applyGlow(color: keyof typeof glowEffects.ambient, intensity: 'ambient' | 'inner' | 'elevation' = 'ambient') {
  if (intensity === 'ambient') {
    return glowEffects.ambient[color];
  }
  return glowEffects[intensity];
}
