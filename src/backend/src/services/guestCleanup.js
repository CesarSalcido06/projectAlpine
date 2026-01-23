/**
 * Project Alpine - Guest Cleanup Service
 *
 * Periodically cleans up expired guest users and their databases.
 * Runs every 15 minutes to remove guests that have expired.
 */

const { Op } = require('sequelize');
const { User } = require('../db/masterDatabase');
const { deleteUserDatabase } = require('../db/userDatabaseManager');

// Cleanup interval: 15 minutes
const CLEANUP_INTERVAL = 15 * 60 * 1000;

let cleanupInterval = null;

/**
 * Clean up all expired guest users
 * @returns {Promise<number>} Number of guests cleaned up
 */
async function cleanupExpiredGuests() {
  try {
    // Find all expired guest users
    const expiredGuests = await User.findAll({
      where: {
        isGuest: true,
        guestExpiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });

    if (expiredGuests.length === 0) {
      return 0;
    }

    console.log(`Cleaning up ${expiredGuests.length} expired guest user(s)...`);

    let cleanedCount = 0;
    for (const guest of expiredGuests) {
      try {
        // Delete the user's database
        await deleteUserDatabase(guest.id);

        // Delete the user from master database
        await guest.destroy();

        cleanedCount++;
        console.log(`Cleaned up expired guest: ${guest.username}`);
      } catch (error) {
        console.error(`Failed to clean up guest ${guest.username}:`, error.message);
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Guest cleanup error:', error);
    return 0;
  }
}

/**
 * Start the periodic guest cleanup service
 */
function startGuestCleanupService() {
  // Run cleanup immediately on startup
  cleanupExpiredGuests().then((count) => {
    if (count > 0) {
      console.log(`Initial cleanup: removed ${count} expired guest(s)`);
    }
  });

  // Schedule periodic cleanup
  cleanupInterval = setInterval(async () => {
    const count = await cleanupExpiredGuests();
    if (count > 0) {
      console.log(`Periodic cleanup: removed ${count} expired guest(s)`);
    }
  }, CLEANUP_INTERVAL);

  console.log(`Guest cleanup service started (interval: ${CLEANUP_INTERVAL / 60000} minutes)`);
}

/**
 * Stop the cleanup service
 */
function stopGuestCleanupService() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Guest cleanup service stopped');
  }
}

module.exports = {
  cleanupExpiredGuests,
  startGuestCleanupService,
  stopGuestCleanupService,
};
