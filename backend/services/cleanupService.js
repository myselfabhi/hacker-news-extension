const cron = require('node-cron');
const Article = require('../models/Article');

/**
 * Cleanup Service for automatic article deletion
 * 
 * Retention Policy:
 * - Read Later articles: 15 days
 * - Saved articles: 1 year (365 days)
 */

class CleanupService {
    constructor() {
        this.READ_LATER_RETENTION_DAYS = 15;
        this.SAVED_RETENTION_DAYS = 365;
    }

    /**
     * Start the scheduled cleanup job
     * Runs every day at 2:00 AM
     */
    startScheduledCleanup() {
        // Run every day at 2:00 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('🧹 Starting scheduled article cleanup...');
            await this.cleanupOldArticles();
        });

        console.log('✅ Cleanup service started - will run daily at 2:00 AM');
        
        // Run initial cleanup on startup (optional, but good for testing)
        this.cleanupOldArticles();
    }

    /**
     * Clean up old articles based on retention policy
     */
    async cleanupOldArticles() {
        try {
            const now = new Date();
            
            // Calculate cutoff dates
            const readLaterCutoff = new Date(now);
            readLaterCutoff.setDate(readLaterCutoff.getDate() - this.READ_LATER_RETENTION_DAYS);
            
            const savedCutoff = new Date(now);
            savedCutoff.setDate(savedCutoff.getDate() - this.SAVED_RETENTION_DAYS);

            // Delete old read-later articles (older than 15 days)
            const readLaterResult = await Article.deleteMany({
                type: 'read-later',
                savedAt: { $lt: readLaterCutoff }
            });

            // Delete old saved articles (older than 1 year)
            const savedResult = await Article.deleteMany({
                type: 'saved',
                savedAt: { $lt: savedCutoff }
            });

            const totalDeleted = readLaterResult.deletedCount + savedResult.deletedCount;

            if (totalDeleted > 0) {
                console.log(`🗑️  Cleanup completed:`);
                console.log(`   - Read Later articles deleted: ${readLaterResult.deletedCount} (older than ${this.READ_LATER_RETENTION_DAYS} days)`);
                console.log(`   - Saved articles deleted: ${savedResult.deletedCount} (older than ${this.SAVED_RETENTION_DAYS} days)`);
                console.log(`   - Total deleted: ${totalDeleted}`);
            } else {
                console.log('✅ Cleanup completed - no old articles to delete');
            }

            return {
                success: true,
                readLaterDeleted: readLaterResult.deletedCount,
                savedDeleted: savedResult.deletedCount,
                totalDeleted
            };

        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get statistics about articles that will be deleted soon
     */
    async getCleanupStats() {
        try {
            const now = new Date();
            
            // Articles expiring in next 3 days
            const readLaterWarning = new Date(now);
            readLaterWarning.setDate(readLaterWarning.getDate() - (this.READ_LATER_RETENTION_DAYS - 3));
            
            const savedWarning = new Date(now);
            savedWarning.setDate(savedWarning.getDate() - (this.SAVED_RETENTION_DAYS - 7));

            const readLaterExpiring = await Article.countDocuments({
                type: 'read-later',
                savedAt: { $lt: readLaterWarning }
            });

            const savedExpiring = await Article.countDocuments({
                type: 'saved',
                savedAt: { $lt: savedWarning }
            });

            return {
                readLaterExpiring,
                savedExpiring
            };
        } catch (error) {
            console.error('Error getting cleanup stats:', error);
            return null;
        }
    }

    /**
     * Manual cleanup trigger (for testing or admin use)
     */
    async triggerManualCleanup() {
        console.log('🧹 Manual cleanup triggered...');
        return await this.cleanupOldArticles();
    }
}

// Create singleton instance
const cleanupService = new CleanupService();

module.exports = cleanupService;

