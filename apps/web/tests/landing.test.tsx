import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LandingPage } from '../src/pages/LandingPage';
import { theme } from '../src/shared/theme/theme';

describe('LandingPage', () => {
  it('renders the phase heading', () => {
    render(
      <ThemeProvider theme={theme}>
        <LandingPage />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'CMS MVP — Phase 0' }),
    ).toBeInTheDocument();
  });
});
