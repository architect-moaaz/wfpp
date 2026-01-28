/**
 * NotificationService
 * Multi-channel notification service with FCM, Pusher, Socket.IO support
 */

const Queue = require('bull');

class NotificationService {
  constructor() {
    this.fcmProvider = null;
    this.pusherProvider = null;
    this.socketIO = null;
    this.queue = null;
    this.deviceTokens = new Map();

    this.initialize();
  }

  initialize() {
    // Try Firebase
    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        const admin = require('firebase-admin');
        if (admin.apps.length === 0) {
          admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
        }
        this.fcmProvider = admin.messaging();
        console.log('[NotificationService] Firebase initialized');
      } catch (e) {
        console.warn('[NotificationService] Firebase not available');
      }
    }

    // Try Pusher
    if (process.env.PUSHER_APP_ID) {
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
      } catch (e) {
        console.warn('[NotificationService] Pusher not available');
      }
    }

    // Initialize Bull queue if Redis available
    try {
      this.queue = new Queue('notification-service', {
        redis: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') }
      });
      this.queue.process(async (job) => this.processJob(job.data));
      console.log('[NotificationService] Queue initialized');
    } catch (e) {
      console.warn('[NotificationService] Queue not available');
    }
  }

  setSocketIO(io) {
    this.socketIO = io;
    console.log('[NotificationService] Socket.IO connected');
  }

  registerDevice(userId, token, platform = 'unknown') {
    if (!this.deviceTokens.has(userId)) this.deviceTokens.set(userId, []);
    const devices = this.deviceTokens.get(userId);
    if (!devices.find(d => d.token === token)) {
      devices.push({ token, platform, registeredAt: new Date() });
    }
    return { success: true };
  }

  async send(options) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const data = {
      id: notificationId,
      userId: options.userId,
      title: options.title,
      message: options.message,
      channel: options.channel || 'all',
      data: options.data || {},
      createdAt: new Date().toISOString()
    };

    if (this.queue) {
      try {
        const job = await this.queue.add(data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
        return { success: true, queued: true, jobId: job.id, notificationId };
      } catch (e) { /* Fall through */ }
    }

    return await this.processJob(data);
  }

  async processJob(data) {
    const userIds = Array.isArray(data.userId) ? data.userId : [data.userId];
    const results = { push: 0, inApp: 0, pusher: 0 };

    for (const userId of userIds) {
      // FCM push
      if (this.fcmProvider && (data.channel === 'all' || data.channel === 'push')) {
        const devices = this.deviceTokens.get(userId) || [];
        for (const device of devices) {
          try {
            await this.fcmProvider.send({
              token: device.token,
              notification: { title: data.title, body: data.message },
              data: data.data
            });
            results.push++;
          } catch (e) { console.warn('[NotificationService] FCM failed:', e.message); }
        }
      }

      // Socket.IO
      if (this.socketIO && (data.channel === 'all' || data.channel === 'in-app')) {
        try {
          this.socketIO.to(`user:${userId}`).emit('notification', data);
          results.inApp++;
        } catch (e) { console.warn('[NotificationService] Socket emit failed'); }
      }

      // Pusher
      if (this.pusherProvider && (data.channel === 'all' || data.channel === 'pusher')) {
        try {
          await this.pusherProvider.trigger(`user-${userId}`, 'notification', data);
          results.pusher++;
        } catch (e) { console.warn('[NotificationService] Pusher failed'); }
      }
    }

    // Mock fallback
    if (!this.fcmProvider && !this.socketIO && !this.pusherProvider) {
      console.log('[NotificationService] Mock notification:', { userId: data.userId, title: data.title });
    }

    return { success: true, notificationId: data.id, results };
  }
}

module.exports = new NotificationService();
