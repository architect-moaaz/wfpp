/**
 * SSR Module Exports
 * Server-side rendering utilities for hybrid SSR/hydration
 */

const pageDataService = require('./PageDataService');
const htmlRenderer = require('./HtmlRenderer');

module.exports = {
  pageDataService,
  htmlRenderer
};
