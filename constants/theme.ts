/**
 * Theme colors - White and Purple
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#FFFFFF',
    tint: '#8B5CF6', // Purple
    icon: '#8B5CF6',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#8B5CF6',
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    secondary: '#A78BFA',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    inputBackground: '#F9FAFB',
    cardBackground: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1A1A1A',
    tint: '#A78BFA',
    icon: '#A78BFA',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#A78BFA',
    primary: '#A78BFA',
    primaryDark: '#8B5CF6',
    secondary: '#C4B5FD',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
    inputBackground: '#111827',
    cardBackground: '#1F2937',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Border radius constants for rounded corners
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
