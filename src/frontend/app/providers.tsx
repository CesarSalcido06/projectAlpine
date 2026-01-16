/**
 * Project Alpine - Client Providers
 *
 * Sets up Chakra UI with dark theme, color mode management,
 * authentication context, and sidebar state management.
 */

'use client';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from '@/styles/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </AuthProvider>
      </ChakraProvider>
    </>
  );
}
