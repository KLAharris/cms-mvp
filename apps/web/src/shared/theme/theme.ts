import { createTheme } from '@mui/material/styles';
import type { CSSProperties } from 'react';

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
  }

  interface TypographyVariants {
    headlineLarge: CSSProperties;
  }

  interface TypographyVariantsOptions {
    headlineLarge?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    headlineLarge: true;
  }
}

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: {
      main: '#6750A4',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71',
      contrastText: '#FFFFFF',
    },
    tertiary: {
      main: '#7D5260',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#B3261E',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FEF7FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1D1B20',
      secondary: '#49454F',
    },
    divider: '#CAC4D0',
  },
  typography: {
    fontFamily: '"Roboto Flex", Roboto, Arial, sans-serif',
    headlineLarge: {
      fontSize: '32px',
      fontWeight: 400,
      lineHeight: '40px',
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FEF7FF',
        },
      },
    },
  },
});
