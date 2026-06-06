import type { Theme } from '@react-navigation/native';

const NAV_FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_600SemiBold',
  heavy: 'Inter_700Bold',
} as const;

export const NAV_THEME = {
  light: {
    background: 'hsl(210 40% 98%)', // background
    border: 'hsl(200 20% 88%)', // border
    card: 'hsl(0 0% 100%)', // card
    notification: 'hsl(0 75% 52%)', // destructive
    primary: 'hsl(188 78% 26%)', // primary
    text: 'hsl(200 28% 14%)', // foreground
  },
  dark: {
    background: 'hsl(200 30% 8%)', // background
    border: 'hsl(200 18% 20%)', // border
    card: 'hsl(200 28% 11%)', // card
    notification: 'hsl(0 68% 54%)', // destructive
    primary: 'hsl(184 65% 44%)', // primary
    text: 'hsl(195 25% 94%)', // foreground
  },
};

export const LIGHT_THEME: Theme = {
  dark: false,
  fonts: {
    regular: {
      fontFamily: NAV_FONTS.regular,
      fontWeight: '400',
    },
    medium: {
      fontFamily: NAV_FONTS.medium,
      fontWeight: '500',
    },
    bold: {
      fontFamily: NAV_FONTS.bold,
      fontWeight: '600',
    },
    heavy: {
      fontFamily: NAV_FONTS.heavy,
      fontWeight: '700',
    },
  },
  colors: NAV_THEME.light,
};
export const DARK_THEME: Theme = {
  dark: true,
  fonts: {
    regular: {
      fontFamily: NAV_FONTS.regular,
      fontWeight: '400',
    },
    medium: {
      fontFamily: NAV_FONTS.medium,
      fontWeight: '500',
    },
    bold: {
      fontFamily: NAV_FONTS.bold,
      fontWeight: '600',
    },
    heavy: {
      fontFamily: NAV_FONTS.heavy,
      fontWeight: '700',
    },
  },
  colors: NAV_THEME.dark,
};
