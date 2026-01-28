import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import PageRenderer from './components/PageRenderer';
import { formsApi } from './api/client';
import './App.css';

// Icon component for navigation
const Icon = ({ name }) => {
  const icons = {
    home: '⌂', dashboard: '▦', book: '☐', books: '☐',
    users: '☻☻', user: '☻', settings: '⚙', list: '☰',
    cart: '⛒', calendar: '☷', bell: '♪', search: '⌕',
    plus: '✚', chart: '≡', folder: '☐', file: '☐',
    money: '∑', alert: '⚠', warning: '⚠', package: '□',
    inventory: '□', checkout: '✓', help: '❓', ticket: '☰',
    default: '●'
  };
  return <span className="nav-icon">{icons[name] || icons.default}</span>;
};

function App() {
  const [pages, setPages] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigation, setNavigation] = useState([]);
  const location = useLocation();

  useEffect(() => { loadAppData(); }, []);

  const getIconForRoute = (route) => {
    if (route.includes('dashboard')) return 'dashboard';
    if (route.includes('submit') || route.includes('new') || route.includes('create')) return 'plus';
    if (route.includes('ticket') || route.includes('list')) return 'list';
    if (route.includes('report') || route.includes('analytics')) return 'chart';
    if (route.includes('help') || route.includes('faq')) return 'help';
    if (route.includes('checkout')) return 'checkout';
    if (route.includes('cart')) return 'cart';
    if (route.includes('book') || route.includes('catalog')) return 'book';
    if (route.includes('user') || route.includes('profile')) return 'user';
    if (route.includes('setting')) return 'settings';
    return 'default';
  };

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
      const mainPages = pagesData.filter(p => !p.route.includes(':'));

      // Detect role-based sections from route prefixes
      const rolePatterns = [
        { key: 'customer', patterns: ['/submit', '/my-', '/customer'], label: 'Customer' },
        { key: 'agent', patterns: ['/agent'], label: 'Agent' },
        { key: 'manager', patterns: ['/manager', '/reports', '/admin'], label: 'Manager' },
        { key: 'staff', patterns: ['/staff'], label: 'Staff' }
      ];

      // Check if app has role-based pages
      const hasRoleBasedNav = rolePatterns.some(role =>
        mainPages.some(p => role.patterns.some(pat => p.route.includes(pat)))
      );

      let navItems = [];

      if (hasRoleBasedNav) {
        // Group by role
        rolePatterns.forEach(role => {
          const rolePages = mainPages.filter(p =>
            role.patterns.some(pat => p.route.includes(pat))
          );
          if (rolePages.length > 0) {
            navItems.push({ type: 'section', label: role.label });
            rolePages.forEach(page => {
              navItems.push({
                label: page.title || page.name.replace(/Page$/, ''),
                route: page.route,
                icon: getIconForRoute(page.route),
                pageExists: true
              });
            });
          }
        });
        // Add uncategorized pages
        const categorizedRoutes = new Set(navItems.filter(n => n.route).map(n => n.route));
        const uncategorized = mainPages.filter(p => !categorizedRoutes.has(p.route));
        if (uncategorized.length > 0) {
          uncategorized.forEach(page => {
            navItems.push({
              label: page.title || page.name.replace(/Page$/, ''),
              route: page.route,
              icon: getIconForRoute(page.route),
              pageExists: true
            });
          });
        }
      } else {
        // Flat navigation for simpler apps
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

  const isActiveRoute = (navRoute) => {
    if (location.pathname === navRoute) return true;
    if (location.pathname === '/' && navRoute === '/dashboard') return true;
    if (navRoute !== '/' && location.pathname.startsWith(navRoute)) return true;
    return false;
  };

  if (loading) {
    return <div className="app-loading"><div className="loading-spinner"></div><p>Loading gentle_falcon...</p></div>;
  }

  const defaultPage = pages.find(p => p.route === '/dashboard') || pages.find(p => p.name.toLowerCase().includes('dashboard')) || pages.find(p => !p.route.includes(':')) || pages[0];

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo"><h2>gentle_falcon</h2></div>
        <div className="nav-links">
          {navigation.map((item, index) => (
            item.type === 'section' ? (
              <div key={index} className="nav-section">{item.label}</div>
            ) : (
              <Link key={index} to={item.route} className={`nav-link ${isActiveRoute(item.route) ? 'active' : ''}`}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </Link>
            )
          ))}
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={defaultPage ? <Navigate to={defaultPage.route} replace /> : <div className="empty-state"><h2>Welcome to gentle_falcon</h2><p>No pages configured.</p></div>} />
          {pages.map(page => <Route key={page.id} path={page.route} element={<PageRenderer page={page} forms={forms} />} />)}
          {navigation.filter(n => !n.pageExists).map((item, i) => <Route key={`fb-${i}`} path={item.route} element={<div style={{padding:'40px',textAlign:'center'}}><h2 style={{color:'#374151'}}>{item.label}</h2><p style={{color:'#6b7280'}}>Page under construction.</p></div>} />)}
          <Route path="*" element={<div style={{padding:'40px',textAlign:'center'}}><h2 style={{color:'#374151'}}>Page Not Found</h2><Link to="/" style={{color:'#2563eb'}}>Go to Dashboard</Link></div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;