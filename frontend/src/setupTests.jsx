import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';

// Mock window.matchMedia for MantineProvider in JSDOM environment
// Only run this mock if 'vi' (Vitest global) is defined, meaning we are in a test environment.
if (typeof vi !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Custom render function to wrap components with MantineProvider and BrowserRouter
const renderWithProviders = (ui, options) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <MantineProvider>{children}</MantineProvider>
      </BrowserRouter>
    ),
    ...options,
  });
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Export the custom render method
export { renderWithProviders as render };