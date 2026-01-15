/**
 * Project Alpine - Trackers Page Route
 *
 * Next.js app router page for the gamified goal tracker.
 */

'use client';

import { Box, Container, Flex } from '@chakra-ui/react';
import Sidebar from '@/components/Sidebar';
import TrackerPage from '@/components/TrackerPage';

export default function TrackersRoute() {
  return (
    <Flex minH="100vh">
      <Sidebar />

      <Box flex="1" p={6}>
        <Container maxW="container.xl">
          <TrackerPage />
        </Container>
      </Box>
    </Flex>
  );
}
