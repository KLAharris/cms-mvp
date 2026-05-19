import { Alert, CssBaseline, Snackbar, ThemeProvider, useMediaQuery } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PropsWithChildren, ReactElement, useMemo, useState } from 'react';

import { darkTheme, lightTheme } from '../../shared/theme/theme';
import { useUiStore } from '../../shared/store/ui.store';

function GlobalSnackbar(): ReactElement {
  const snack = useUiStore((s) => s.snack);
  const hideSnack = useUiStore((s) => s.hideSnack);

  return (
    <Snackbar
      open={snack.open}
      autoHideDuration={4000}
      onClose={hideSnack}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={hideSnack} severity={snack.severity} variant="filled">
        {snack.message}
      </Alert>
    </Snackbar>
  );
}

export function AppProviders({ children }: PropsWithChildren): ReactElement {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const themeMode = useUiStore((s) => s.themeMode);

  const activeTheme = useMemo(() => {
    if (themeMode === 'dark') return darkTheme;
    if (themeMode === 'light') return lightTheme;
    return prefersDarkMode ? darkTheme : lightTheme;
  }, [themeMode, prefersDarkMode]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 60_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={activeTheme}>
        <CssBaseline />
        {children}
        <GlobalSnackbar />
      </ThemeProvider>
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
