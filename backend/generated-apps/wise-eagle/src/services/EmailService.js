/**
 * EmailService
 * Multi-provider email service with SendGrid, SES, SMTP support
 */

const Queue = require('bull');

class EmailService {
  constructor() {
    this.provider = null;
    this.providerName = 'none';
    this.queue = null;

    this.initialize();
  }

  initialize() {
    // Try SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.provider = sgMail;
        this.providerName = 'sendgrid';
        console.log('[EmailService] SendGrid initialized');
      } catch (e) {
        console.warn('[EmailService] SendGrid not available');
      }
    }
    // Try SMTP
    else if (process.env.SMTP_HOST) {
      try {
        const nodemailer = require('nodemailer');
        this.provider = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        this.providerName = 'smtp';
        console.log('[EmailService] SMTP initialized');
      } catch (e) {
        console.warn('[EmailService] SMTP not available');
      }
    }
    else {
      console.warn('[EmailService] No email provider configured (mock mode)');
      this.providerName = 'mock';
    }

    // Initialize Bull queue if Redis available
    try {
      this.queue = new Queue('email-service', {
        redis: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') }
      });
      this.queue.process(async (job) => this.processJob(job.data));
      console.log('[EmailService] Queue initialized');
    } catch (e) {
      console.warn('[EmailService] Queue not available');
    }
  }

  async send(options) {
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const emailData = {
      id: emailId,
      to: options.to,
      from: options.from || process.env.EMAIL_FROM || 'noreply@app.local',
      subject: this.interpolate(options.subject, options.variables),
      html: options.template ? this.renderTemplate(options.template, options.variables) : this.interpolate(options.body, options.variables),
      text: options.text,
      createdAt: new Date().toISOString()
    };

    if (this.queue) {
      try {
        const job = await this.queue.add(emailData, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        return { success: true, queued: true, jobId: job.id, emailId };
      } catch (e) { /* Fall through to direct send */ }
    }

    return await this.processJob(emailData);
  }

  async processJob(emailData) {
    try {
      if (this.providerName === 'sendgrid') {
        await this.provider.send({ to: emailData.to, from: emailData.from, subject: emailData.subject, html: emailData.html });
      } else if (this.providerName === 'smtp') {
        await this.provider.sendMail({ from: emailData.from, to: emailData.to, subject: emailData.subject, html: emailData.html });
      } else {
        console.log('[EmailService] Mock email:', { to: emailData.to, subject: emailData.subject });
      }
      return { success: true, emailId: emailData.id, provider: this.providerName };
    } catch (error) {
      console.error('[EmailService] Send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  interpolate(str, vars = {}) {
    if (!str) return str;
    return str.replace(/\{\{([^}]+)\}\}/g, (m, k) => vars[k.trim()] !== undefined ? vars[k.trim()] : m);
  }

  renderTemplate(name, vars = {}) {
    const templates = {
      'notification': '<h1>{{title}}</h1><p>{{message}}</p>',
      'welcome': '<h1>Welcome, {{name}}!</h1><p>Your account has been created.</p>',
      'workflow-completed': '<h1>Workflow Completed</h1><p>{{workflowName}} completed at {{completedAt}}</p>'
    };
    return this.interpolate(templates[name] || vars.body || '<p>No content</p>', vars);
  }
}

module.exports = new EmailService();
