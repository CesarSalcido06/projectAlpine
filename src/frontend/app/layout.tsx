/**
 * Project Alpine - Root Layout
 *
 * Wraps the entire application with Chakra UI provider
 * and sets up the dark theme.
 */

import { Providers } from './providers';

export const metadata = {
  title: 'Project Alpine',
  description: 'Task manager for balancing academics and athletics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
