/**
 * Design Tokens for PoemsIndia
 *
 * Single source of truth for colors, spacing, typography, and other design values.
 * These tokens are consumed by Tailwind configuration and can be used in components.
 *
 * @see /Users/shivamsinghtomar/.claude/plans/flickering-skipping-fox.md for full design system documentation
 */

export const DesignTokens = {
  colors: {
    primary: {
      DEFAULT: '#FF6100',  // Main orange - use for CTAs, active states, links
      hover: '#CC4E00',    // Darker orange for hover states
      light: '#FFF3ED',    // Light orange for backgrounds and subtle highlights
      dark: '#B33D00'      // Dark orange for pressed/active states
    },
    neutral: {
      white: '#FFFFFF',
      black: '#000000',
      gray: {
        50: '#F9FAFB',   // Lightest gray - backgrounds
        100: '#F3F4F6',  // Very light gray - secondary backgrounds
        200: '#E5E7EB',  // Light gray - borders, dividers
        300: '#D1D5DB',  // Medium-light gray - disabled states
        400: '#9CA3AF',  // Medium gray - placeholders
        500: '#6B7280',  // Mid gray - secondary text
        600: '#4B5563',  // Dark gray - body text
        700: '#374151',  // Darker gray - headings
        800: '#1F2937',  // Very dark gray - dark mode backgrounds
        900: '#111827'   // Darkest gray - primary text, dark mode text
      }
    },
    semantic: {
      success: '#10B981',  // Green - success messages, positive actions
      error: '#EF4444',    // Red - error messages, destructive actions
      warning: '#F59E0B',  // Amber - warning messages, caution states
      info: '#3B82F6'      // Blue - informational messages, neutral alerts
    },
    // Role-specific colors for admin/reviewer/studio modes
    role: {
      admin: {
        DEFAULT: '#DC2626',  // Red-600
        light: '#FEE2E2',    // Red-100
        dark: '#991B1B'      // Red-800
      },
      reviewer: {
        DEFAULT: '#2563EB',  // Blue-600
        light: '#DBEAFE',    // Blue-100
        dark: '#1E40AF'      // Blue-800
      },
      studio: {
        DEFAULT: '#9333EA',  // Purple-600
        light: '#F3E8FF',    // Purple-100
        dark: '#6B21A8'      // Purple-800
      }
    }
  },
  spacing: {
    page: {
      mobile: '1rem',      // 16px - mobile page padding
      tablet: '1.5rem',    // 24px - tablet page padding
      desktop: '2rem',     // 32px - desktop page padding
      wide: '3rem'         // 48px - wide desktop page padding
    },
    component: {
      xs: '0.5rem',        // 8px
      sm: '0.75rem',       // 12px
      md: '1rem',          // 16px
      lg: '1.5rem',        // 24px
      xl: '2rem',          // 32px
      '2xl': '2.5rem',     // 40px
      '3xl': '3rem'        // 48px
    }
  },
  typography: {
    fontFamily: {
      sans: ['Source Sans Pro', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      serif: ['Crimson Text', 'Georgia', 'Cambria', 'Times New Roman', 'serif']
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
      '5xl': ['3rem', { lineHeight: '1' }],           // 48px
      '6xl': ['3.75rem', { lineHeight: '1' }]         // 60px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px'   // Fully rounded (pills, circles)
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  transitions: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms'
  }
} as const;

// Type exports for TypeScript consumers
export type DesignTokenColors = typeof DesignTokens.colors;
export type DesignTokenSpacing = typeof DesignTokens.spacing;
export type DesignTokenTypography = typeof DesignTokens.typography;
