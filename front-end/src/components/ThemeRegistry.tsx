'use client';

import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000', // Black color for the navbar
    },
    secondary: {
      main: '#ffffff',
    },
  },
});

// Create Emotion cache for MUI
const emotionCache = createCache({
  key: 'mui-style',
  prepend: true,
});

export default function ThemeRegistry({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}