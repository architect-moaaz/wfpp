/**
 * EmailService
 *
 * Handles email sending with support for multiple providers:
 * - SendGrid (primary)
 * - AWS SES (fallback)
 * - SMTP (generic fallback)
 *
 * Features:
 * - Template support with variable interpolation
 * - Queue-based async sending via Bull
 * - Retry with exponential backoff
 * - Email tracking and logging
 */

const Queue = require('bull');

class EmailService {
  constructor() {
    this.provider = null;
    this.providerName = 'none';
    this.queue = null;
    this.emailLog = [];
    this.maxLogSize = 1000;

    this.initialize();
  }

  /**
   * Initialize email provider based on environment configuration
   */
  initialize() {
    // Try SendGrid first
    if (process.env.SENDGRID_API_KEY) {
      this.initializeSendGrid();
    }
    // Try AWS SES
    else if (process.env.AWS_SES_REGION && process.env.AWS_ACCESS_KEY_ID) {
      this.initializeAWSSES();
    }
    // Try SMTP
    else if (process.env.SMTP_HOST) {
      this.initializeSMTP();
    }
    else {
      console.warn('[EmailService] No email provider configured. Emails will be logged only.');
      this.providerName = 'mock';
    }

    // Initialize Bull queue for async processing
    this.initializeQueue();
  }

  /**
   * Initialize SendGrid provider
   */
  initializeSendGrid() {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.provider = sgMail;
      this.providerName = 'sendgrid';
      console.log('[EmailService] SendGrid initialized');
    } catch (error) {
      console.error('[EmailService] Failed to initialize SendGrid:', error.message);
    }
  }

  /**
   * Initialize AWS SES provider
   */
  initializeAWSSES() {
    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      this.provider = new SESClient({
        region: process.env.AWS_SES_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      this.providerName = 'ses';
      this.SendEmailCommand = SendEmailCommand;
      console.log('[EmailService] AWS SES initialized');
    } catch (error) {
      console.error('[EmailService] Failed to initialize AWS SES:', error.message);
    }
  }

  /**
   * Initialize SMTP provider using nodemailer
   */
  initializeSMTP() {
    try {
      const nodemailer = require('nodemailer');
      this.provider = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      this.providerName = 'smtp';
      console.log('[EmailService] SMTP initialized');
    } catch (error) {
      console.error('[EmailService] Failed to initialize SMTP:', error.message);
    }
  }

  /**
   * Initialize Bull queue for async email processing
   */
  initializeQueue() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3
    };

    try {
      this.queue = new Queue('email-service', { redis: redisConfig });

      // Process email jobs
      this.queue.process(async (job) => {
        return await this.processEmailJob(job.data);
      });

      // Event handlers
      this.queue.on('completed', (job, result) => {
        console.log(`[EmailService] Email job ${job.id} completed`);
      });

      this.queue.on('failed', (job, err) => {
        console.error(`[EmailService] Email job ${job.id} failed:`, err.message);
      });

      console.log('[EmailService] Queue initialized');
    } catch (error) {
      console.warn('[EmailService] Queue not available (Redis may not be running):', error.message);
      this.queue = null;
    }
  }

  /**
   * Send email (queued for async processing)
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.body - Email body (HTML)
   * @param {string} options.text - Plain text body (optional)
   * @param {string} options.from - Sender email (optional, uses default)
   * @param {string} options.template - Template name (optional)
   * @param {Object} options.variables - Template variables (optional)
   * @param {Array} options.attachments - Attachments (optional)
   * @param {string} options.priority - Priority: high, normal, low
   * @returns {Object} - { success, jobId, emailId }
   */
  async send(options) {
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const emailData = {
      id: emailId,
      to: options.to,
      from: options.from || process.env.EMAIL_FROM || 'noreply@workflow.app',
      subject: this.interpolate(options.subject, options.variables),
      html: options.template
        ? await this.renderTemplate(options.template, options.variables)
        : this.interpolate(options.body, options.variables),
      text: options.text ? this.interpolate(options.text, options.variables) : undefined,
      attachments: options.attachments,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      metadata: options.metadata,
      createdAt: new Date().toISOString()
    };

    // Queue if available, otherwise send directly
    if (this.queue) {
      try {
        const job = await this.queue.add(emailData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          priority: options.priority === 'high' ? 1 : options.priority === 'low' ? 3 : 2,
          removeOnComplete: 100,
          removeOnFail: 50
        });

        this.logEmail(emailData, 'queued', job.id);

        return {
          success: true,
          queued: true,
          jobId: job.id,
          emailId
        };
      } catch (error) {
        console.error('[EmailService] Failed to queue email:', error.message);
        // Fall through to direct send
      }
    }

    // Direct send (synchronous fallback)
    const result = await this.processEmailJob(emailData);
    return {
      success: result.success,
      queued: false,
      emailId,
      error: result.error
    };
  }

  /**
   * Process email job (called by queue or directly)
   */
  async processEmailJob(emailData) {
    const startTime = Date.now();

    try {
      let result;

      switch (this.providerName) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(emailData);
          break;
        case 'ses':
          result = await this.sendViaSES(emailData);
          break;
        case 'smtp':
          result = await this.sendViaSMTP(emailData);
          break;
        default:
          result = this.sendViaMock(emailData);
      }

      const executionTime = Date.now() - startTime;
      this.logEmail(emailData, 'sent', null, { provider: this.providerName, executionTime });

      return {
        success: true,
        provider: this.providerName,
        messageId: result.messageId,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logEmail(emailData, 'failed', null, { error: error.message, executionTime });

      console.error(`[EmailService] Failed to send email to ${emailData.to}:`, error.message);

      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Send via SendGrid
   */
  async sendViaSendGrid(emailData) {
    const msg = {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: emailData.replyTo,
      cc: emailData.cc,
      bcc: emailData.bcc,
      attachments: emailData.attachments?.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.contentType,
        disposition: 'attachment'
      }))
    };

    const response = await this.provider.send(msg);
    return { messageId: response[0]?.headers?.['x-message-id'] };
  }

  /**
   * Send via AWS SES
   */
  async sendViaSES(emailData) {
    const params = {
      Destination: {
        ToAddresses: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        CcAddresses: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc]) : undefined,
        BccAddresses: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc]) : undefined
      },
      Message: {
        Body: {
          Html: { Charset: 'UTF-8', Data: emailData.html },
          Text: emailData.text ? { Charset: 'UTF-8', Data: emailData.text } : undefined
        },
        Subject: { Charset: 'UTF-8', Data: emailData.subject }
      },
      Source: emailData.from,
      ReplyToAddresses: emailData.replyTo ? [emailData.replyTo] : undefined
    };

    const command = new this.SendEmailCommand(params);
    const response = await this.provider.send(command);
    return { messageId: response.MessageId };
  }

  /**
   * Send via SMTP (nodemailer)
   */
  async sendViaSMTP(emailData) {
    const mailOptions = {
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      replyTo: emailData.replyTo,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }))
    };

    const info = await this.provider.sendMail(mailOptions);
    return { messageId: info.messageId };
  }

  /**
   * Mock send (logging only)
   */
  sendViaMock(emailData) {
    console.log('[EmailService] Mock email sent:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from
    });
    return { messageId: `mock_${emailData.id}` };
  }

  /**
   * Render email template with variables
   */
  async renderTemplate(templateName, variables = {}) {
    // Built-in templates
    const templates = {
      'welcome': `
        <h1>Welcome, {{name}}!</h1>
        <p>Thank you for joining. Your account has been created successfully.</p>
        <p>Click the button below to get started:</p>
        <a href="{{actionUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Get Started</a>
      `,
      'password-reset': `
        <h1>Password Reset Request</h1>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="{{resetUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in {{expiresIn}} hours.</p>
      `,
      'notification': `
        <h1>{{title}}</h1>
        <p>{{message}}</p>
        {{#if actionUrl}}
        <a href="{{actionUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">{{actionText}}</a>
        {{/if}}
      `,
      'workflow-completed': `
        <h1>Workflow Completed</h1>
        <p>The workflow <strong>{{workflowName}}</strong> has completed successfully.</p>
        <p><strong>Instance ID:</strong> {{instanceId}}</p>
        <p><strong>Completed at:</strong> {{completedAt}}</p>
        {{#if resultSummary}}
        <h2>Summary</h2>
        <p>{{resultSummary}}</p>
        {{/if}}
      `,
      'workflow-failed': `
        <h1>Workflow Failed</h1>
        <p>The workflow <strong>{{workflowName}}</strong> has failed.</p>
        <p><strong>Instance ID:</strong> {{instanceId}}</p>
        <p><strong>Failed at:</strong> {{failedAt}}</p>
        <p><strong>Error:</strong> {{errorMessage}}</p>
        <a href="{{dashboardUrl}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Details</a>
      `,
      'form-submission': `
        <h1>New Form Submission</h1>
        <p>A new submission has been received for <strong>{{formName}}</strong>.</p>
        <p><strong>Submitted at:</strong> {{submittedAt}}</p>
        <p><strong>Submitted by:</strong> {{submittedBy}}</p>
        <h2>Submission Data</h2>
        <table style="border-collapse: collapse; width: 100%;">
          {{#each fields}}
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">{{this.label}}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">{{this.value}}</td>
          </tr>
          {{/each}}
        </table>
      `
    };

    let html = templates[templateName];

    if (!html) {
      console.warn(`[EmailService] Template '${templateName}' not found, using variables as body`);
      html = variables.body || variables.html || '<p>No content</p>';
    }

    return this.interpolate(html, variables);
  }

  /**
   * Interpolate variables in string
   */
  interpolate(str, variables = {}) {
    if (!str || typeof str !== 'string') return str;

    // Handle {{variable}} syntax
    let result = str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(variables, key.trim());
      return value !== undefined ? value : match;
    });

    // Handle simple conditionals {{#if variable}}...{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
      return variables[key] ? content : '';
    });

    // Handle {{#each array}}...{{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, template) => {
      const array = variables[key];
      if (!Array.isArray(array)) return '';
      return array.map(item => {
        return template.replace(/\{\{this\.(\w+)\}\}/g, (m, prop) => item[prop] || '');
      }).join('');
    });

    return result;
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Log email for tracking
   */
  logEmail(emailData, status, jobId = null, extra = {}) {
    const logEntry = {
      id: emailData.id,
      to: emailData.to,
      subject: emailData.subject,
      status,
      jobId,
      timestamp: new Date().toISOString(),
      ...extra
    };

    this.emailLog.push(logEntry);

    // Keep log size bounded
    if (this.emailLog.length > this.maxLogSize) {
      this.emailLog = this.emailLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Get email logs
   */
  getLogs(limit = 50, filters = {}) {
    let logs = [...this.emailLog];

    if (filters.status) {
      logs = logs.filter(l => l.status === filters.status);
    }

    if (filters.to) {
      logs = logs.filter(l => l.to.includes(filters.to));
    }

    return logs.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const total = this.emailLog.length;
    const sent = this.emailLog.filter(l => l.status === 'sent').length;
    const failed = this.emailLog.filter(l => l.status === 'failed').length;
    const queued = this.emailLog.filter(l => l.status === 'queued').length;

    return {
      total,
      sent,
      failed,
      queued,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(2) : 0,
      provider: this.providerName,
      queueAvailable: !!this.queue
    };
  }

  /**
   * Verify provider connection
   */
  async verifyConnection() {
    if (this.providerName === 'mock') {
      return { success: true, provider: 'mock', message: 'No email provider configured' };
    }

    try {
      if (this.providerName === 'smtp') {
        await this.provider.verify();
      }
      return { success: true, provider: this.providerName };
    } catch (error) {
      return { success: false, provider: this.providerName, error: error.message };
    }
  }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;
module.exports.EmailService = EmailService;
