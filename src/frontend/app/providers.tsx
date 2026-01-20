/**
 * Project Alpine - Client Providers
 *
 * Sets up Chakra UI with dark theme, color mode management,
 * authentication context, sidebar state, and refresh management.
 */

'use client';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from '@/styles/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { RefreshProvider } from '@/contexts/RefreshContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <RefreshProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </RefreshProvider>
        </AuthProvider>
      </ChakraProvider>
    </>
  );
}
