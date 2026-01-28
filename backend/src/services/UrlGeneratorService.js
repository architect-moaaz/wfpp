/**
 * UrlGeneratorService
 *
 * Generates and manages access URLs for deployed applications
 */

class UrlGeneratorService {
  constructor() {
    // URL templates for different environment types
    this.templates = {
      local: {
        frontend: 'http://localhost:{port}',
        backend: 'http://localhost:{port}/api',
        api_docs: 'http://localhost:{port}/api/workflows',
        health: 'http://localhost:{port}/api/health',
        swagger: 'http://localhost:{port}/api-docs'
      },
      development: {
        frontend: 'https://{slug}.dev.{domain}',
        backend: 'https://{slug}.dev.{domain}/api',
        api_docs: 'https://{slug}.dev.{domain}/api/docs',
        health: 'https://{slug}.dev.{domain}/api/health',
        swagger: 'https://{slug}.dev.{domain}/api-docs'
      },
      staging: {
        frontend: 'https://{slug}.staging.{domain}',
        backend: 'https://{slug}.staging.{domain}/api',
        api_docs: 'https://{slug}.staging.{domain}/api/docs',
        health: 'https://{slug}.staging.{domain}/api/health',
        swagger: 'https://{slug}.staging.{domain}/api-docs'
      },
      production: {
        frontend: 'https://{slug}.{domain}',
        backend: 'https://{slug}.{domain}/api',
        api_docs: 'https://{slug}.{domain}/api/docs',
        health: 'https://{slug}.{domain}/api/health',
        swagger: 'https://{slug}.{domain}/api-docs'
      }
    };

    // Default domain
    this.defaultDomain = 'workflowpp.io';
  }

  /**
   * Generate URLs for an application in an environment
   */
  generate(application, environment, port = null) {
    const slug = this.getSlug(application);
    const envType = environment.type || 'local';
    const templates = this.templates[envType] || this.templates.local;
    const domain = environment.host || this.defaultDomain;

    const urls = {};
    const actualPort = port || environment.port || 4000;

    for (const [key, template] of Object.entries(templates)) {
      urls[key] = this.interpolate(template, {
        slug,
        domain,
        port: actualPort,
        env: envType
      });
    }

    // Add custom URLs from environment config
    if (environment.config?.custom_urls) {
      Object.assign(urls, environment.config.custom_urls);
    }

    // Override with base_url if set
    if (environment.base_url) {
      urls.frontend = environment.base_url;
      urls.backend = `${environment.base_url}/api`;
      urls.api_docs = `${environment.base_url}/api/docs`;
      urls.health = `${environment.base_url}/api/health`;
    }

    return urls;
  }

  /**
   * Generate URL for a specific endpoint type
   */
  generateSingle(application, environment, urlType, port = null) {
    const urls = this.generate(application, environment, port);
    return urls[urlType] || null;
  }

  /**
   * Generate frontend URL
   */
  generateFrontendUrl(application, environment, port = null) {
    return this.generateSingle(application, environment, 'frontend', port);
  }

  /**
   * Generate backend/API URL
   */
  generateBackendUrl(application, environment, port = null) {
    return this.generateSingle(application, environment, 'backend', port);
  }

  /**
   * Generate health check URL
   */
  generateHealthUrl(application, environment, port = null) {
    return this.generateSingle(application, environment, 'health', port);
  }

  /**
   * Get application slug from name or explicit slug
   */
  getSlug(application) {
    if (application.slug) return application.slug;
    if (application.name) {
      return application.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    return application.id;
  }

  /**
   * Interpolate template with values
   */
  interpolate(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key] !== undefined ? values[key] : match;
    });
  }

  /**
   * Validate if a URL is reachable
   */
  async validateUrl(url, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        reachable: true,
        status: response.status,
        ok: response.ok
      };
    } catch (error) {
      return {
        reachable: false,
        error: error.message
      };
    }
  }

  /**
   * Validate all URLs for a deployment
   */
  async validateAllUrls(urls, timeout = 5000) {
    const results = {};

    for (const [key, url] of Object.entries(urls)) {
      if (url) {
        results[key] = await this.validateUrl(url, timeout);
        results[key].url = url;
      }
    }

    return results;
  }

  /**
   * Generate QR code data URL for a given URL
   * (Returns a data string that can be used with QR code library)
   */
  generateQRCodeData(url) {
    // This returns data that can be used with a QR code library
    // The actual QR code generation would happen on the frontend
    return {
      url,
      format: 'url',
      size: 256
    };
  }

  /**
   * Generate mobile deep link URL
   */
  generateDeepLink(application, environment, path = '') {
    const slug = this.getSlug(application);
    const envPrefix = environment.type === 'production' ? '' : `${environment.type}-`;

    return {
      ios: `workflowpp://${envPrefix}${slug}${path}`,
      android: `intent://workflowpp/${envPrefix}${slug}${path}#Intent;scheme=workflowpp;package=io.workflowpp.app;end`,
      universal: `https://${slug}.${environment.type === 'production' ? '' : environment.type + '.'}workflowpp.io${path}`
    };
  }

  /**
   * Generate webhook URL for external integrations
   */
  generateWebhookUrl(application, environment, webhookId) {
    const baseUrl = this.generateBackendUrl(application, environment);
    return `${baseUrl}/webhooks/${webhookId}`;
  }

  /**
   * Generate OAuth callback URL
   */
  generateOAuthCallbackUrl(application, environment, provider) {
    const baseUrl = this.generateBackendUrl(application, environment);
    return `${baseUrl}/auth/${provider}/callback`;
  }

  /**
   * Get URL pattern for environment type
   */
  getPattern(envType) {
    return this.templates[envType] || this.templates.local;
  }

  /**
   * Set custom domain for an environment type
   */
  setCustomDomain(envType, domain) {
    if (this.templates[envType]) {
      // Update templates to use custom domain
      for (const key of Object.keys(this.templates[envType])) {
        if (this.templates[envType][key].includes('{domain}')) {
          // Domain is already templated, will use the one passed to generate()
        }
      }
    }
  }

  /**
   * Format URL for display (truncate if too long)
   */
  formatForDisplay(url, maxLength = 50) {
    if (!url || url.length <= maxLength) return url;
    const start = url.substring(0, maxLength - 10);
    const end = url.substring(url.length - 7);
    return `${start}...${end}`;
  }

  /**
   * Extract port from URL
   */
  extractPort(url) {
    try {
      const parsed = new URL(url);
      return parsed.port || (parsed.protocol === 'https:' ? 443 : 80);
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is HTTPS
   */
  isSecure(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

module.exports = UrlGeneratorService;
