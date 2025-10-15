import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MantineProvider } from '@mantine/core';

// Mock window.matchMedia for MantineProvider in JSDOM environment
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

// Custom render function to wrap components with MantineProvider
const customRender = (ui, options) =>
  render(ui, { wrapper: ({ children }) => <MantineProvider>{children}</MantineProvider>, ...options });

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Export the custom render method
export { customRender };