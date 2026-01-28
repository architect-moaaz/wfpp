import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import PageRenderer from './components/PageRenderer';
import { formsApi } from './api/client';
import './App.css';

// Icon component for navigation
const Icon = ({ name }) => {
  const icons = {
    home: '\u2302',
    dashboard: '\u25A6',
    book: '\u2610',
    books: '\u2610',
    users: '\u263B\u263B',
    user: '\u263B',
    settings: '\u2699',
    list: '\u2630',
    cart: '\u26D2',
    calendar: '\u2637',
    bell: '\u266A',
    search: '\u2315',
    plus: '\u271A',
    chart: '\u2261',
    folder: '\u2610',
    file: '\u2610',
    money: '\u2211',
    alert: '\u26A0',
    warning: '\u26A0',
    package: '\u25A1',
    inventory: '\u25A1',
    checkout: '\u2713',
    help: '\u2753',
    ticket: '\u2630',
    'arrow-right': '\u2192',
    default: '\u25CF'
  };
  return <span className="nav-icon">{icons[name] || icons.default}</span>;
};

function App() {
  const [pages, setPages] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigation, setNavigation] = useState([]);
  const location = useLocation();

  useEffect(() => {
    loadAppData();
  }, []);

  const loadAppData = async () => {
    try {
      const [pagesRes, formsRes] = await Promise.all([
        fetch('/api/resources/pages').then(r => r.json()),
        formsApi.list().catch(() => ({ data: [] }))
      ]);

      const pagesData = pagesRes.data || pagesRes || [];
      const formsData = formsRes.data || [];

      setPages(pagesData);
      setForms(formsData);

      // Build navigation from ALL pages, grouped by role/section
      // Exclude detail pages with :id in their routes
      const mainPages = pagesData.filter(p => !p.route.includes(':'));

      // Group pages by route prefix for role-based navigation
      const customerPages = mainPages.filter(p =>
        p.route.includes('/submit') ||
        p.route.includes('/my-') ||
        p.route.includes('/customer') ||
        p.route === '/help' ||
        p.route === '/faq'
      );

      const agentPages = mainPages.filter(p =>
        p.route.includes('/agent')
      );

      const managerPages = mainPages.filter(p =>
        p.route.includes('/manager') ||
        p.route === '/reports'
      );

      // Build navigation with sections
      let navItems = [];

      // Customer section
      if (customerPages.length > 0) {
        navItems.push({ type: 'section', label: 'Customer' });
        customerPages.forEach(page => {
          navItems.push({
            label: page.title || page.name.replace(/Page$/, ''),
            route: page.route,
            icon: getIconForRoute(page.route),
            pageExists: true
          });
        });
      }

      // Agent section
      if (agentPages.length > 0) {
        navItems.push({ type: 'section', label: 'Agent' });
        agentPages.forEach(page => {
          navItems.push({
            label: page.title || page.name.replace(/Page$/, ''),
            route: page.route,
            icon: getIconForRoute(page.route),
            pageExists: true
          });
        });
      }

      // Manager section
      if (managerPages.length > 0) {
        navItems.push({ type: 'section', label: 'Manager' });
        managerPages.forEach(page => {
          navItems.push({
            label: page.title || page.name.replace(/Page$/, ''),
            route: page.route,
            icon: getIconForRoute(page.route),
            pageExists: true
          });
        });
      }

      // If no role-based grouping found, fall back to flat list
      if (navItems.length === 0) {
        navItems = mainPages.map(p => ({
          label: p.title || p.name.replace(/Page$/, ''),
          route: p.route,
          icon: getIconForRoute(p.route),
          pageExists: true
        }));
      }

      setNavigation(navItems);
    } catch (error) {
      console.error('Error loading app data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get icon based on route
  const getIconForRoute = (route) => {
    if (route.includes('dashboard')) return 'dashboard';
    if (route.includes('submit') || route.includes('new')) return 'plus';
    if (route.includes('ticket')) return 'list';
    if (route.includes('report')) return 'chart';
    if (route.includes('help') || route.includes('faq')) return 'help';
    return 'default';
  };

  // Find page by route, handling both exact matches and pattern matches
  const findPageByRoute = (route) => {
    // Exact match first
    let page = pages.find(p => p.route === route);
    if (page) return page;

    // Try matching without leading slash differences
    page = pages.find(p => p.route.replace(/^\//, '') === route.replace(/^\//, ''));
    if (page) return page;

    // Try partial match for similar routes
    const routeBase = route.split('/').pop()?.toLowerCase() || '';
    page = pages.find(p => {
      const pageRouteBase = p.route.split('/').pop()?.toLowerCase() || '';
      return pageRouteBase === routeBase ||
             p.name.toLowerCase().includes(routeBase.replace(/-/g, ''));
    });

    return page;
  };

  // Check if a nav item is active
  const isActiveRoute = (navRoute) => {
    if (location.pathname === navRoute) return true;
    if (location.pathname === '/' && navRoute === '/dashboard') return true;
    // Handle nested routes
    if (navRoute !== '/' && location.pathname.startsWith(navRoute)) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading Support Ticket System...</p>
      </div>
    );
  }

  // Find dashboard or first available page for default route
  const defaultPage = pages.find(p => p.route === '/dashboard') ||
                      pages.find(p => p.name.toLowerCase().includes('dashboard')) ||
                      pages.find(p => !p.route.includes(':')) ||
                      pages[0];

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <h2>Ticket System</h2>
        </div>
        <div className="nav-links">
          {navigation.map((item, index) => (
            item.type === 'section' ? (
              <div key={index} className="nav-section">
                {item.label}
              </div>
            ) : (
              <Link
                key={index}
                to={item.route}
                className={`nav-link ${isActiveRoute(item.route) ? 'active' : ''}`}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          ))}
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          {/* Default route redirects to dashboard or first page */}
          <Route path="/" element={
            defaultPage ? (
              <Navigate to={defaultPage.route} replace />
            ) : (
              <div className="empty-state">
                <h2>Welcome to Support Ticket System</h2>
                <p>No pages have been configured yet.</p>
              </div>
            )
          } />

          {/* Dynamic routes for each page */}
          {pages.map(page => (
            <Route
              key={page.id}
              path={page.route}
              element={<PageRenderer page={page} forms={forms} />}
            />
          ))}

          {/* Fallback routes for menu items that don't have matching pages */}
          {navigation.filter(n => !n.pageExists).map((item, index) => (
            <Route
              key={`fallback-${index}`}
              path={item.route}
              element={
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <h2 style={{ color: '#374151', marginBottom: '16px' }}>{item.label}</h2>
                  <p style={{ color: '#6b7280' }}>This page is under construction.</p>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
                    Route: {item.route}
                  </p>
                </div>
              }
            />
          ))}

          {/* Catch-all for unmatched routes */}
          <Route path="*" element={
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h2 style={{ color: '#374151', marginBottom: '16px' }}>Page Not Found</h2>
              <p style={{ color: '#6b7280' }}>The requested page does not exist.</p>
              <Link to="/" style={{ color: '#2563eb', marginTop: '16px', display: 'inline-block' }}>
                Go to Dashboard
              </Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
