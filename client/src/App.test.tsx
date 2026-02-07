import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/test-utils';
import App from './App';

describe('App', () => {
  it('renders all nav items', () => {
    renderWithProviders(<App />);

    const navItems = [
      'Panel Map',
      'Pin Manager',
      'Component Library',
      'Power Budget',
      'Wiring Diagram',
      'MobiFlight',
      'BOM Generator',
      'Journal',
      'Reference',
      'Calibrate Sections',
    ];

    for (const item of navItems) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('renders PanelForge heading', () => {
    renderWithProviders(<App />);
    expect(screen.getByText('PanelForge')).toBeInTheDocument();
  });
});
