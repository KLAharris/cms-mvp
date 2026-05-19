import { createTheme } from '@mui/material/styles';
import type { CSSProperties } from 'react';

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
    primaryContainer: Palette['primary'];
    onPrimaryContainer: Palette['primary'];
    surfaceContainer: Palette['primary'];
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
    primaryContainer?: PaletteOptions['primary'];
    onPrimaryContainer?: PaletteOptions['primary'];
    surfaceContainer?: PaletteOptions['primary'];
  }

  interface TypographyVariants {
    displayMedium: CSSProperties;
    headlineLarge: CSSProperties;
    bodyMedium: CSSProperties;
    labelLarge: CSSProperties;
  }

  interface TypographyVariantsOptions {
    displayMedium?: CSSProperties;
    headlineLarge?: CSSProperties;
    bodyMedium?: CSSProperties;
    labelLarge?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    displayMedium: true;
    headlineLarge: true;
    bodyMedium: true;
    labelLarge: true;
  }
}

const typography = {
  fontFamily: '"Roboto Flex", Roboto, Arial, sans-serif',
  displayMedium: {
    fontSize: '45px',
    fontWeight: 400,
    lineHeight: '52px',
    letterSpacing: 0,
  },
  headlineLarge: {
    fontSize: '32px',
    fontWeight: 400,
    lineHeight: '40px',
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '20px',
    letterSpacing: '0.25px',
  },
  labelLarge: {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '20px',
    letterSpacing: '0.1px',
  },
};

export const lightTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4',
      contrastText: '#FFFFFF',
    },
    primaryContainer: {
      main: '#EADDFF',
      contrastText: '#21005D',
    },
    onPrimaryContainer: {
      main: '#21005D',
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
    surfaceContainer: {
      main: '#F3EDF7',
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
  typography,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@import':
          'url("https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,400..700&family=Roboto+Mono:wght@400;500&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0")',
        body: {
          backgroundColor: '#FEF7FF',
        },
        '.material-symbols-rounded': {
          direction: 'ltr',
          display: 'inline-block',
          fontFamily: "'Material Symbols Rounded'",
          fontFeatureSettings: "'liga'",
          fontSize: 24,
          fontStyle: 'normal',
          fontWeight: 'normal',
          letterSpacing: 'normal',
          lineHeight: 1,
          textTransform: 'none',
          whiteSpace: 'nowrap',
          wordWrap: 'normal',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 9999,
          textTransform: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
  },
});

export const darkTheme = createTheme({
  ...lightTheme,
  palette: {
    ...lightTheme.palette,
    mode: 'dark',
    primary: {
      main: '#D0BCFF',
      contrastText: '#381E72',
    },
    primaryContainer: {
      main: '#4F378B',
      contrastText: '#EADDFF',
    },
    onPrimaryContainer: {
      main: '#EADDFF',
    },
    secondary: {
      main: '#CCC2DC',
      contrastText: '#332D41',
    },
    tertiary: {
      main: '#EFB8C8',
      contrastText: '#492532',
    },
    error: {
      main: '#F2B8B5',
      contrastText: '#601410',
    },
    surfaceContainer: {
      main: '#211F26',
    },
    background: {
      default: '#141218',
      paper: '#211F26',
    },
    text: {
      primary: '#E6E0E9',
      secondary: '#CAC4D0',
    },
    divider: '#49454F',
  },
});

export const theme = lightTheme;
