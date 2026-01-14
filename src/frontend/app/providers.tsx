/**
 * Project Alpine - Client Providers
 *
 * Sets up Chakra UI with dark theme and color mode management.
 */

'use client';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from '@/styles/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </>
  );
}
