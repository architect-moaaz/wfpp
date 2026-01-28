/**
 * NotificationService
 *
 * Handles push notifications and in-app notifications with support for multiple providers:
 * - Firebase Cloud Messaging (FCM) for mobile push
 * - Pusher for real-time web notifications
 * - WebSocket fallback for in-app notifications
 *
 * Features:
 * - Multi-channel support (push, in-app, email)
 * - User device token management
 * - Notification preferences
 * - Queue-based async sending via Bull
 * - Notification history and analytics
 */

const Queue = require('bull');

class NotificationService {
  constructor() {
    this.fcmProvider = null;
    this.pusherProvider = null;
    this.queue = null;
    this.socketIO = null;
    this.deviceTokens = new Map(); // userId -> [{ token, platform, deviceId }]
    this.notificationLog = [];
    this.maxLogSize = 1000;
    this.userPreferences = new Map(); // userId -> { channels: [], quiet: { start, end } }

    this.initialize();
  }

  /**
   * Initialize notification providers
   */
  initialize() {
    // Initialize Firebase Cloud Messaging
    if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PROJECT_ID) {
      this.initializeFirebase();
    }

    // Initialize Pusher
    if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY) {
      this.initializePusher();
    }

    // Initialize Bull queue
    this.initializeQueue();

    if (!this.fcmProvider && !this.pusherProvider) {
      console.warn('[NotificationService] No notification providers configured. Using mock mode.');
    }
  }

  /**
   * Initialize Firebase Admin SDK for FCM
   */
  initializeFirebase() {
    try {
      const admin = require('firebase-admin');

      // Check if already initialized
      if (admin.apps.length === 0) {
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          // Service account JSON (base64 encoded or file path)
          let serviceAccount;
          if (process.env.FIREBASE_SERVICE_ACCOUNT.startsWith('{')) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          } else if (process.env.FIREBASE_SERVICE_ACCOUNT.startsWith('/')) {
            serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
          } else {
            // Base64 encoded
            serviceAccount = JSON.parse(
              Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
            );
          }
          credential = admin.credential.cert(serviceAccount);
        } else {
          // Use application default credentials
          credential = admin.credential.applicationDefault();
        }

        admin.initializeApp({
          credential,
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }

      this.fcmProvider = admin.messaging();
      console.log('[NotificationService] Firebase Cloud Messaging initialized');
    } catch (error) {
      console.error('[NotificationService] Failed to initialize Firebase:', error.message);
    }
  }

  /**
   * Initialize Pusher for real-time notifications
   */
  initializePusher() {
    try {
      const Pusher = require('pusher');

      this.pusherProvider = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER || 'us2',
        useTLS: true
      });

      console.log('[NotificationService] Pusher initialized');
    } catch (error) {
      console.error('[NotificationService] Failed to initialize Pusher:', error.message);
    }
  }

  /**
   * Initialize Bull queue for async processing
   */
  initializeQueue() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3
    };

    try {
      this.queue = new Queue('notification-service', { redis: redisConfig });

      // Process notification jobs
      this.queue.process(async (job) => {
        return await this.processNotificationJob(job.data);
      });

      this.queue.on('completed', (job, result) => {
        console.log(`[NotificationService] Notification job ${job.id} completed`);
      });

      this.queue.on('failed', (job, err) => {
        console.error(`[NotificationService] Notification job ${job.id} failed:`, err.message);
      });

      console.log('[NotificationService] Queue initialized');
    } catch (error) {
      console.warn('[NotificationService] Queue not available:', error.message);
      this.queue = null;
    }
  }

  /**
   * Set Socket.IO instance for real-time notifications
   */
  setSocketIO(io) {
    this.socketIO = io;
    console.log('[NotificationService] Socket.IO connected');
  }

  /**
   * Register device token for push notifications
   */
  registerDevice(userId, token, platform = 'unknown', deviceId = null) {
    if (!this.deviceTokens.has(userId)) {
      this.deviceTokens.set(userId, []);
    }

    const devices = this.deviceTokens.get(userId);
    const existingIndex = devices.findIndex(d => d.token === token);

    if (existingIndex >= 0) {
      // Update existing
      devices[existingIndex] = { token, platform, deviceId, updatedAt: new Date() };
    } else {
      // Add new
      devices.push({ token, platform, deviceId, registeredAt: new Date() });
    }

    console.log(`[NotificationService] Registered device for user ${userId}: ${platform}`);
    return { success: true, deviceCount: devices.length };
  }

  /**
   * Unregister device token
   */
  unregisterDevice(userId, token) {
    if (!this.deviceTokens.has(userId)) return { success: false };

    const devices = this.deviceTokens.get(userId);
    const filtered = devices.filter(d => d.token !== token);
    this.deviceTokens.set(userId, filtered);

    return { success: true, deviceCount: filtered.length };
  }

  /**
   * Set user notification preferences
   */
  setUserPreferences(userId, preferences) {
    this.userPreferences.set(userId, {
      channels: preferences.channels || ['push', 'in-app'],
      quietHours: preferences.quietHours || null,
      emailDigest: preferences.emailDigest || false,
      ...preferences
    });
    return { success: true };
  }

  /**
   * Send notification to user(s)
   * @param {Object} options - Notification options
   * @param {string|string[]} options.userId - Target user ID(s)
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification body
   * @param {string} options.channel - Channel: push, in-app, all (default: all)
   * @param {Object} options.data - Additional data payload
   * @param {string} options.priority - Priority: high, normal, low
   * @param {string} options.category - Notification category
   * @param {Object} options.action - Action on tap { type, url, screen }
   */
  async send(options) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notificationData = {
      id: notificationId,
      userId: options.userId,
      title: options.title,
      message: options.message,
      channel: options.channel || 'all',
      data: options.data || {},
      priority: options.priority || 'normal',
      category: options.category,
      action: options.action,
      createdAt: new Date().toISOString()
    };

    // Queue if available
    if (this.queue) {
      try {
        const job = await this.queue.add(notificationData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          priority: options.priority === 'high' ? 1 : options.priority === 'low' ? 3 : 2,
          removeOnComplete: 100,
          removeOnFail: 50
        });

        this.logNotification(notificationData, 'queued', job.id);

        return {
          success: true,
          queued: true,
          jobId: job.id,
          notificationId
        };
      } catch (error) {
        console.error('[NotificationService] Failed to queue notification:', error.message);
      }
    }

    // Direct send
    const result = await this.processNotificationJob(notificationData);
    return {
      success: result.success,
      queued: false,
      notificationId,
      results: result.results
    };
  }

  /**
   * Process notification job
   */
  async processNotificationJob(notificationData) {
    const userIds = Array.isArray(notificationData.userId)
      ? notificationData.userId
      : [notificationData.userId];

    const results = {
      push: { sent: 0, failed: 0 },
      inApp: { sent: 0, failed: 0 },
      pusher: { sent: 0, failed: 0 }
    };

    for (const userId of userIds) {
      // Check user preferences
      const prefs = this.userPreferences.get(userId) || { channels: ['push', 'in-app'] };

      // Check quiet hours
      if (this.isQuietHours(prefs.quietHours) && notificationData.priority !== 'high') {
        console.log(`[NotificationService] Skipping notification for ${userId} (quiet hours)`);
        continue;
      }

      const channel = notificationData.channel;

      // Send push notification
      if ((channel === 'all' || channel === 'push') && prefs.channels.includes('push')) {
        const pushResult = await this.sendPushNotification(userId, notificationData);
        if (pushResult.success) results.push.sent++;
        else results.push.failed++;
      }

      // Send in-app notification via Socket.IO
      if ((channel === 'all' || channel === 'in-app') && prefs.channels.includes('in-app')) {
        const inAppResult = await this.sendInAppNotification(userId, notificationData);
        if (inAppResult.success) results.inApp.sent++;
        else results.inApp.failed++;
      }

      // Send via Pusher
      if ((channel === 'all' || channel === 'pusher') && this.pusherProvider) {
        const pusherResult = await this.sendPusherNotification(userId, notificationData);
        if (pusherResult.success) results.pusher.sent++;
        else results.pusher.failed++;
      }
    }

    this.logNotification(notificationData, 'sent', null, results);

    return {
      success: true,
      results
    };
  }

  /**
   * Send push notification via FCM
   */
  async sendPushNotification(userId, notificationData) {
    if (!this.fcmProvider) {
      return this.sendMockPush(userId, notificationData);
    }

    const devices = this.deviceTokens.get(userId) || [];

    if (devices.length === 0) {
      console.log(`[NotificationService] No devices registered for user ${userId}`);
      return { success: false, reason: 'no_devices' };
    }

    const tokens = devices.map(d => d.token);

    try {
      const message = {
        notification: {
          title: notificationData.title,
          body: notificationData.message
        },
        data: {
          notificationId: notificationData.id,
          category: notificationData.category || '',
          action: JSON.stringify(notificationData.action || {}),
          ...Object.fromEntries(
            Object.entries(notificationData.data || {}).map(([k, v]) => [k, String(v)])
          )
        },
        android: {
          priority: notificationData.priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId: notificationData.category || 'default',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notificationData.title,
                body: notificationData.message
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      if (tokens.length === 1) {
        message.token = tokens[0];
        await this.fcmProvider.send(message);
      } else {
        message.tokens = tokens;
        const response = await this.fcmProvider.sendEachForMulticast(message);

        // Remove invalid tokens
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
              this.unregisterDevice(userId, tokens[idx]);
            }
          });
        }
      }

      return { success: true, tokenCount: tokens.length };
    } catch (error) {
      console.error(`[NotificationService] FCM send failed for ${userId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mock push notification (logging only)
   */
  sendMockPush(userId, notificationData) {
    console.log(`[NotificationService] Mock push to ${userId}:`, {
      title: notificationData.title,
      message: notificationData.message
    });
    return { success: true, mock: true };
  }

  /**
   * Send in-app notification via Socket.IO
   */
  async sendInAppNotification(userId, notificationData) {
    if (!this.socketIO) {
      console.log(`[NotificationService] In-app notification for ${userId} (no socket):`, notificationData.title);
      return { success: true, delivered: false };
    }

    try {
      this.socketIO.to(`user:${userId}`).emit('notification', {
        id: notificationData.id,
        title: notificationData.title,
        message: notificationData.message,
        category: notificationData.category,
        data: notificationData.data,
        action: notificationData.action,
        createdAt: notificationData.createdAt
      });

      return { success: true, delivered: true };
    } catch (error) {
      console.error(`[NotificationService] Socket emit failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification via Pusher
   */
  async sendPusherNotification(userId, notificationData) {
    if (!this.pusherProvider) {
      return { success: false, reason: 'no_pusher' };
    }

    try {
      await this.pusherProvider.trigger(`user-${userId}`, 'notification', {
        id: notificationData.id,
        title: notificationData.title,
        message: notificationData.message,
        category: notificationData.category,
        data: notificationData.data,
        action: notificationData.action,
        createdAt: notificationData.createdAt
      });

      return { success: true };
    } catch (error) {
      console.error(`[NotificationService] Pusher send failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to topic/channel (broadcast)
   */
  async sendToTopic(topic, notificationData) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const results = { fcm: false, pusher: false };

    // FCM topic
    if (this.fcmProvider) {
      try {
        await this.fcmProvider.send({
          topic,
          notification: {
            title: notificationData.title,
            body: notificationData.message
          },
          data: notificationData.data || {}
        });
        results.fcm = true;
      } catch (error) {
        console.error(`[NotificationService] FCM topic send failed:`, error.message);
      }
    }

    // Pusher channel
    if (this.pusherProvider) {
      try {
        await this.pusherProvider.trigger(topic, 'notification', {
          id: notificationId,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data
        });
        results.pusher = true;
      } catch (error) {
        console.error(`[NotificationService] Pusher channel send failed:`, error.message);
      }
    }

    return { success: results.fcm || results.pusher, notificationId, results };
  }

  /**
   * Check if current time is within quiet hours
   */
  isQuietHours(quietHours) {
    if (!quietHours || !quietHours.start || !quietHours.end) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Crosses midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  /**
   * Log notification for tracking
   */
  logNotification(notificationData, status, jobId = null, extra = {}) {
    const logEntry = {
      id: notificationData.id,
      userId: notificationData.userId,
      title: notificationData.title,
      channel: notificationData.channel,
      status,
      jobId,
      timestamp: new Date().toISOString(),
      ...extra
    };

    this.notificationLog.push(logEntry);

    if (this.notificationLog.length > this.maxLogSize) {
      this.notificationLog = this.notificationLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Get notification logs
   */
  getLogs(limit = 50, filters = {}) {
    let logs = [...this.notificationLog];

    if (filters.userId) {
      logs = logs.filter(l =>
        Array.isArray(l.userId) ? l.userId.includes(filters.userId) : l.userId === filters.userId
      );
    }

    if (filters.status) {
      logs = logs.filter(l => l.status === filters.status);
    }

    return logs.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const total = this.notificationLog.length;
    const sent = this.notificationLog.filter(l => l.status === 'sent').length;
    const queued = this.notificationLog.filter(l => l.status === 'queued').length;

    return {
      total,
      sent,
      queued,
      providers: {
        fcm: !!this.fcmProvider,
        pusher: !!this.pusherProvider,
        socketIO: !!this.socketIO
      },
      registeredDevices: this.deviceTokens.size,
      queueAvailable: !!this.queue
    };
  }
}

// Singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
module.exports.NotificationService = NotificationService;
