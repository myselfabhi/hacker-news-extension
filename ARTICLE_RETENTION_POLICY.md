# **Article Retention Policy**

## **Overview**

The VU tech extension automatically cleans up old articles to maintain optimal performance and storage efficiency. This document describes the retention policy and cleanup mechanism.

---

## **Retention Periods**

### **Read Later Articles**
- **Retention:** 15 days
- **Rationale:** Read Later articles are meant for short-term reading. After 15 days, they're automatically removed to keep your list focused and relevant.

### **Saved Articles**
- **Retention:** 1 year (365 days)
- **Rationale:** Saved articles are meant for long-term reference. They're kept for a full year before automatic cleanup.

---

## **How It Works**

### **Automatic Cleanup**
- **Schedule:** Runs daily at 2:00 AM (server time)
- **Process:** Scans all articles and removes those exceeding their retention period
- **Logging:** Each cleanup operation logs the number of articles deleted

### **What Gets Deleted**
- Read Later articles older than 15 days (based on `savedAt` timestamp)
- Saved articles older than 1 year (based on `savedAt` timestamp)

---

## **User Notifications**

Users are informed about the retention policy through:
1. **Articles Modal:** A prominent notice displays the retention periods when viewing saved/read later articles
2. **Visual Design:** Blue-themed information banner with clear retention period details

---

## **Technical Implementation**

### **Backend Service**
- **Location:** `/backend/services/cleanupService.js`
- **Technology:** Node-cron for scheduled tasks
- **Database:** MongoDB with Mongoose ORM

### **Cron Schedule**
```javascript
cron.schedule('0 2 * * *', async () => {
    // Runs daily at 2:00 AM
    await cleanupOldArticles();
});
```

### **Cleanup Logic**
```javascript
// Read Later: Delete articles older than 15 days
await Article.deleteMany({
    type: 'read-later',
    savedAt: { $lt: readLaterCutoff }
});

// Saved: Delete articles older than 1 year
await Article.deleteMany({
    type: 'saved',
    savedAt: { $lt: savedCutoff }
});
```

---

## **Manual Testing**

### **Test Cleanup Service**
To manually trigger cleanup (for testing):

1. Access the cleanup service:
```javascript
const cleanupService = require('./services/cleanupService');
await cleanupService.triggerManualCleanup();
```

2. Check cleanup stats:
```javascript
const stats = await cleanupService.getCleanupStats();
console.log('Articles expiring soon:', stats);
```

---

## **Database Queries**

### **Find Articles About to Expire**

**Read Later (expiring in 3 days):**
```javascript
const expiringReadLater = await Article.find({
    type: 'read-later',
    savedAt: { 
        $lt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)  // 12 days old
    }
});
```

**Saved (expiring in 7 days):**
```javascript
const expiringSaved = await Article.find({
    type: 'saved',
    savedAt: { 
        $lt: new Date(Date.now() - 358 * 24 * 60 * 60 * 1000)  // 358 days old
    }
});
```

---

## **Monitoring**

### **Server Logs**
The cleanup service logs detailed information:
- ✅ Service startup confirmation
- 🧹 Cleanup start time
- 🗑️ Number of articles deleted (by type)
- ❌ Any errors encountered

### **Example Log Output**
```
✅ Cleanup service started - will run daily at 2:00 AM
🧹 Starting scheduled article cleanup...
🗑️  Cleanup completed:
   - Read Later articles deleted: 23 (older than 15 days)
   - Saved articles deleted: 5 (older than 365 days)
   - Total deleted: 28
```

---

## **User Best Practices**

### **To Keep Articles Longer**
- Move important **Read Later** articles to **Saved** to extend their lifetime from 15 days to 1 year
- Use the **Save** button in the articles modal to quickly convert Read Later to Saved

### **Managing Your Collection**
- Regularly review your **Read Later** list
- Archive truly important articles by moving them to **Saved**
- Remove articles manually if you no longer need them

---

## **Future Enhancements**

Potential improvements to the retention system:
- [ ] User-configurable retention periods
- [ ] Export articles before deletion
- [ ] Email notifications for articles about to expire
- [ ] Archive feature for permanent storage
- [ ] Per-article custom retention settings

---

## **Configuration**

To modify retention periods, edit `/backend/services/cleanupService.js`:

```javascript
class CleanupService {
    constructor() {
        this.READ_LATER_RETENTION_DAYS = 15;    // Change this
        this.SAVED_RETENTION_DAYS = 365;         // Change this
    }
}
```

**Note:** Restart the server after making changes.

---

## **Troubleshooting**

### **Cleanup Not Running**
1. Check server logs for cron job confirmation
2. Verify MongoDB connection is active
3. Check for any error messages in logs

### **Articles Not Being Deleted**
1. Verify the `savedAt` field exists on articles
2. Check the retention period configuration
3. Manually trigger cleanup for testing

### **Performance Issues**
1. Monitor cleanup execution time in logs
2. Consider adding database indexes on `savedAt` field
3. Adjust cleanup schedule if needed

---

**Last Updated:** October 10, 2025
**Version:** 1.0.0

