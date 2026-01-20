/**
 * Project Alpine - Chakra UI Theme Configuration
 *
 * Dark-first theme with custom color palette for task urgency levels
 * and a minimal, clean aesthetic.
 */

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Color mode configuration - dark by default
const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

// Custom color palette
const colors = {
  // Brand colors
  brand: {
    50: '#e6f2ff',
    100: '#b3d9ff',
    200: '#80bfff',
    300: '#4da6ff',
    400: '#1a8cff',
    500: '#0073e6',
    600: '#005bb3',
    700: '#004280',
    800: '#002a4d',
    900: '#00111a',
  },

  // Urgency level colors
  urgency: {
    low: '#48BB78',      // Green - can wait
    medium: '#ECC94B',   // Yellow - should do soon
    high: '#ED8936',     // Orange - needs attention
    critical: '#F56565', // Red - do immediately
  },

  // Status colors
  status: {
    pending: '#A0AEC0',
    inProgress: '#4299E1',
    completed: '#48BB78',
    archived: '#718096',
  },

  // Dark theme backgrounds
  dark: {
    bg: '#0d1117',
    card: '#161b22',
    border: '#30363d',
    hover: '#21262d',
  },
};

// Component style overrides
const components = {
  // Card component styling
  Card: {
    baseStyle: {
      container: {
        bg: 'dark.card',
        borderColor: 'dark.border',
        borderWidth: '1px',
        borderRadius: 'lg',
      },
    },
  },

  // Button styling
  Button: {
    defaultProps: {
      colorScheme: 'brand',
    },
  },

  // Input styling
  Input: {
    defaultProps: {
      focusBorderColor: 'brand.500',
    },
  },
};

// Global styles
const styles = {
  global: {
    body: {
      bg: 'dark.bg',
      color: 'gray.100',
    },
  },
};

// Extend the default theme
const theme = extendTheme({
  config,
  colors,
  components,
  styles,
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
});

export default theme;
