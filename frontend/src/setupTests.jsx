import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Mock de APIs do navegador para o ambiente JSDOM
if (typeof vi !== 'undefined') {
  const ResizeObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  const IntersectionObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: () => [],
  }));

  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

  // Mock do window.alert para não travar os testes
  window.alert = vi.fn();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Função de renderização customizada com providers
const renderWithProviders = (ui, options) => {
  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <BrowserRouter>
          <MantineProvider>{children}</MantineProvider>
        </BrowserRouter>
      ),
      ...options,
    }),
  };
};

// Re-exporta tudo do testing-library
export * from '@testing-library/react';

// Exporta o render customizado
export { renderWithProviders as render };