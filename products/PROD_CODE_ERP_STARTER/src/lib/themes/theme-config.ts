/**
 * Enterprise Theme Configuration
 * Multiple professionally designed color schemes for Weathercraft ERP
 */

export interface ThemeColors {
  name: string;
  label: string;
  description: string;
  primary: string; // HSL format: "H S% L%"
  primaryDark: string;
  accent: string;
  accentGlow: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  backgroundGradient: string[];
}

export const themes: Record<string, ThemeColors> = {
  techGreen: {
    name: 'techGreen',
    label: 'Tech Green',
    description: 'Deep tech green with teal accents',
    primary: '173 58% 39%',      // Teal-600
    primaryDark: '174 56% 33%',   // Teal-700
    accent: '173 58% 39%',        // Teal-600
    accentGlow: '174 56% 33%',    // Teal-700
    gradientFrom: 'rgba(13, 148, 136, 0.03)',
    gradientTo: 'rgba(94, 234, 212, 0.02)',
    glowColor: 'rgba(13, 148, 136, 0.3)',
    backgroundGradient: [
      'rgba(13, 148, 136, 0.03)',
      'rgba(20, 184, 166, 0.02)',
      'rgba(94, 234, 212, 0.02)',
      'rgba(13, 148, 136, 0.02)',
      'rgba(15, 118, 110, 0.03)'
    ]
  },

  purpleRain: {
    name: 'purpleRain',
    label: 'Purple Rain',
    description: 'Royal purple with violet accents',
    primary: '271 81% 56%',       // Purple-500
    primaryDark: '271 75% 50%',   // Purple-600
    accent: '271 91% 65%',        // Purple-400
    accentGlow: '271 81% 56%',    // Purple-500
    gradientFrom: 'rgba(147, 51, 234, 0.03)',
    gradientTo: 'rgba(192, 132, 252, 0.02)',
    glowColor: 'rgba(147, 51, 234, 0.3)',
    backgroundGradient: [
      'rgba(147, 51, 234, 0.03)',
      'rgba(168, 85, 247, 0.02)',
      'rgba(192, 132, 252, 0.02)',
      'rgba(147, 51, 234, 0.02)',
      'rgba(126, 34, 206, 0.03)'
    ]
  },

  electricBlue: {
    name: 'electricBlue',
    label: 'Electric Blue',
    description: 'Electric blue with cyan highlights',
    primary: '199 89% 48%',       // Sky-600
    primaryDark: '200 98% 39%',   // Sky-700
    accent: '199 95% 60%',        // Sky-400
    accentGlow: '199 89% 48%',    // Sky-600
    gradientFrom: 'rgba(2, 132, 199, 0.03)',
    gradientTo: 'rgba(125, 211, 252, 0.02)',
    glowColor: 'rgba(2, 132, 199, 0.3)',
    backgroundGradient: [
      'rgba(2, 132, 199, 0.03)',
      'rgba(14, 165, 233, 0.02)',
      'rgba(56, 189, 248, 0.02)',
      'rgba(2, 132, 199, 0.02)',
      'rgba(3, 105, 161, 0.03)'
    ]
  },

  sunsetOrange: {
    name: 'sunsetOrange',
    label: 'Sunset Orange',
    description: 'Warm orange with amber glow',
    primary: '24 94% 50%',        // Orange-600
    primaryDark: '20 91% 48%',    // Orange-700
    accent: '24 95% 60%',         // Orange-400
    accentGlow: '24 94% 50%',     // Orange-600
    gradientFrom: 'rgba(234, 88, 12, 0.03)',
    gradientTo: 'rgba(251, 146, 60, 0.02)',
    glowColor: 'rgba(234, 88, 12, 0.3)',
    backgroundGradient: [
      'rgba(234, 88, 12, 0.03)',
      'rgba(249, 115, 22, 0.02)',
      'rgba(251, 146, 60, 0.02)',
      'rgba(234, 88, 12, 0.02)',
      'rgba(194, 65, 12, 0.03)'
    ]
  },

  crimsonRed: {
    name: 'crimsonRed',
    label: 'Crimson Red',
    description: 'Bold crimson with rose accents',
    primary: '346 77% 50%',       // Rose-600
    primaryDark: '346 75% 45%',   // Rose-700
    accent: '346 87% 60%',        // Rose-400
    accentGlow: '346 77% 50%',    // Rose-600
    gradientFrom: 'rgba(225, 29, 72, 0.03)',
    gradientTo: 'rgba(251, 113, 133, 0.02)',
    glowColor: 'rgba(225, 29, 72, 0.3)',
    backgroundGradient: [
      'rgba(225, 29, 72, 0.03)',
      'rgba(244, 63, 94, 0.02)',
      'rgba(251, 113, 133, 0.02)',
      'rgba(225, 29, 72, 0.02)',
      'rgba(190, 18, 60, 0.03)'
    ]
  },

  emeraldGreen: {
    name: 'emeraldGreen',
    label: 'Emerald Green',
    description: 'Rich emerald with jade highlights',
    primary: '160 84% 39%',       // Emerald-600
    primaryDark: '161 83% 34%',   // Emerald-700
    accent: '160 84% 48%',        // Emerald-500
    accentGlow: '160 84% 39%',    // Emerald-600
    gradientFrom: 'rgba(5, 150, 105, 0.03)',
    gradientTo: 'rgba(52, 211, 153, 0.02)',
    glowColor: 'rgba(5, 150, 105, 0.3)',
    backgroundGradient: [
      'rgba(5, 150, 105, 0.03)',
      'rgba(16, 185, 129, 0.02)',
      'rgba(52, 211, 153, 0.02)',
      'rgba(5, 150, 105, 0.02)',
      'rgba(4, 120, 87, 0.03)'
    ]
  },

  midnightBlue: {
    name: 'midnightBlue',
    label: 'Midnight Blue',
    description: 'Deep midnight blue with indigo',
    primary: '221 83% 53%',       // Blue-600
    primaryDark: '222 82% 48%',   // Blue-700
    accent: '221 91% 60%',        // Blue-500
    accentGlow: '221 83% 53%',    // Blue-600
    gradientFrom: 'rgba(37, 99, 235, 0.03)',
    gradientTo: 'rgba(96, 165, 250, 0.02)',
    glowColor: 'rgba(37, 99, 235, 0.3)',
    backgroundGradient: [
      'rgba(37, 99, 235, 0.03)',
      'rgba(59, 130, 246, 0.02)',
      'rgba(96, 165, 250, 0.02)',
      'rgba(37, 99, 235, 0.02)',
      'rgba(29, 78, 216, 0.03)'
    ]
  },

  amberGold: {
    name: 'amberGold',
    label: 'Amber Gold',
    description: 'Luxurious amber with gold shimmer',
    primary: '38 92% 50%',        // Amber-500
    primaryDark: '32 95% 44%',    // Amber-600
    accent: '38 92% 60%',         // Amber-400
    accentGlow: '38 92% 50%',     // Amber-500
    gradientFrom: 'rgba(245, 158, 11, 0.03)',
    gradientTo: 'rgba(252, 211, 77, 0.02)',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    backgroundGradient: [
      'rgba(245, 158, 11, 0.03)',
      'rgba(251, 191, 36, 0.02)',
      'rgba(252, 211, 77, 0.02)',
      'rgba(245, 158, 11, 0.02)',
      'rgba(217, 119, 6, 0.03)'
    ]
  }
};

export type ThemeName = keyof typeof themes;

export const getTheme = (themeName: ThemeName): ThemeColors => {
  return themes[themeName] || themes.techGreen;
};

export const getAllThemes = (): ThemeColors[] => {
  return Object.values(themes);
};
