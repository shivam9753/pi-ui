/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class', // This enables class-based dark mode
  theme: {
    extend: {
      // Design System Colors
      colors: {
        primary: {
          DEFAULT: '#FF6100',  // Main orange
          hover: '#CC4E00',    // Darker orange for hover states
          light: '#FFF3ED',    // Light orange for backgrounds
          dark: '#B33D00'      // Dark orange for pressed states
        },
        neutral: {
          white: '#FFFFFF',
          black: '#000000',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827'
        },
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        // Role-specific colors
        admin: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#991B1B'
        },
        reviewer: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
          dark: '#1E40AF'
        },
        studio: {
          DEFAULT: '#9333EA',
          light: '#F3E8FF',
          dark: '#6B21A8'
        }
      },
      // Typography
      fontFamily: {
        sans: ['Source Sans Pro', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Crimson Text', 'Georgia', 'Cambria', 'Times New Roman', 'serif']
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }]
      },
      // Spacing
      spacing: {
        'page-mobile': '1rem',
        'page-tablet': '1.5rem',
        'page-desktop': '2rem',
        'page-wide': '3rem'
      },
      // Border Radius
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px'
      },
      // Box Shadow
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      },
      // Transitions
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '300ms'
      }
    },
  },
  plugins: [],
}