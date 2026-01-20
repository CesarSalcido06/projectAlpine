/**
 * Project Alpine - Trackers Page Route
 *
 * Next.js app router page for the gamified goal tracker.
 */

'use client';

import { Container } from '@chakra-ui/react';
import AppLayout from '@/components/AppLayout';
import { AuthGuard } from '@/components/AuthGuard';
import TrackerPage from '@/components/TrackerPage';

export default function TrackersRoute() {
  return (
    <AuthGuard>
      <AppLayout>
        <Container maxW="container.xl">
          <TrackerPage />
        </Container>
      </AppLayout>
    </AuthGuard>
  );
}
