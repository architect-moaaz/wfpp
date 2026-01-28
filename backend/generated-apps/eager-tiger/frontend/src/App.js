import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import PageRenderer from './components/PageRenderer';
import { formsApi, setAuthToken } from './api/client';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import './App.css';

// Icon component for navigation using Lucide-style SVG icons
const Icon = ({ name }) => {
  const icons = {
    home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    list: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    help: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    checkout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    cart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    book: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    folder: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
    alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    ticket: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>,
    default: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
  };
  return <span className="nav-icon">{icons[name] || icons.default}</span>;
};

// Protected Route wrapper
const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Get SSR initial state if available
const getInitialState = () => {
  if (typeof window !== 'undefined' && window.__INITIAL_STATE__) {
    return window.__INITIAL_STATE__;
  }
  return null;
};

function App() {
  const initialState = getInitialState();
  const isSSR = typeof window !== 'undefined' && window.__SSR__;

  // Initialize state from SSR if available
  const [pages, setPages] = useState(initialState?.pages || []);
  const [forms, setForms] = useState(initialState?.forms || []);
  const [loading, setLoading] = useState(!isSSR); // Skip loading if SSR
  const [navigation, setNavigation] = useState(initialState?.navigation || []);
  const [initialPageData, setInitialPageData] = useState(initialState?.pageData || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
      setAuthToken(token);
    }
    setAuthChecked(true);
  }, []);

  // Load app data - skip if we have SSR data
  useEffect(() => {
    // If we have SSR data and it's the initial route, skip loading
    if (isSSR && initialState?.pages?.length > 0) {
      setLoading(false);
      // Clear the initial page data after first use
      if (initialPageData && location.pathname !== initialState?.route) {
        setInitialPageData(null);
      }
      return;
    }
    loadAppData();
  }, []);

  // Clear initial page data when navigating to a different route
  useEffect(() => {
    if (initialPageData && location.pathname !== initialState?.route) {
      setInitialPageData(null);
    }
  }, [location.pathname]);

  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

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

      // Build navigation from page navigation.menu metadata
      // Merge and deduplicate menu items from all pages
      const menuMap = new Map();
      const routeToPage = new Map(pagesData.map(p => [p.route, p]));

      // Collect all menu items from pages
      pagesData.forEach(page => {
        if (page.navigation?.menu) {
          page.navigation.menu.forEach(item => {
            // Use route as key to deduplicate
            if (!menuMap.has(item.route)) {
              menuMap.set(item.route, {
                label: item.label,
                route: item.route,
                icon: item.icon || getIconForRoute(item.route),
                pageExists: routeToPage.has(item.route)
              });
            }
          });
        }
      });

      // If no navigation metadata, fall back to building from pages
      let navItems = [];
      if (menuMap.size > 0) {
        // Sort: dashboard/home first, then alphabetically
        navItems = Array.from(menuMap.values()).sort((a, b) => {
          if (a.route === '/dashboard' || a.route === '/') return -1;
          if (b.route === '/dashboard' || b.route === '/') return 1;
          if (a.route.includes('create') || a.route.includes('new')) return 1;
          if (b.route.includes('create') || b.route.includes('new')) return -1;
          return a.label.localeCompare(b.label);
        });
      } else {
        // Fallback: Build from pages directly
        const mainPages = pagesData.filter(p => !p.route.includes(':'));
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

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading eager_tiger...</p>
        </div>
      </div>
    );
  }

  // Separate auth pages from protected pages based on MoE-generated metadata
  const authPages = pages.filter(p => p.type === 'auth' || p.pageAssociation?.requiresAuth === false);
  const protectedPages = pages.filter(p => p.type !== 'auth' && p.pageAssociation?.requiresAuth !== false);

  // Find entry point - prioritize isEntryPoint flag, then auth login, then dashboard
  const entryPointPage = pages.find(p => p.pageAssociation?.isEntryPoint === true);
  const loginPage = authPages.find(p => p.name?.toLowerCase().includes('login') || p.route?.includes('login'));
  const dashboardPage = protectedPages.find(p => p.route === '/dashboard') ||
    protectedPages.find(p => p.name?.toLowerCase().includes('dashboard')) ||
    protectedPages.find(p => !p.route?.includes(':')) ||
    protectedPages[0];

  // If not authenticated, show auth pages
  if (!isAuthenticated && authPages.length > 0) {
    const authEntryPoint = entryPointPage || loginPage || authPages[0];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Routes>
          {authPages.map(page => (
            <Route
              key={page.id}
              path={page.route}
              element={<PageRenderer page={page} forms={forms} onAuthSuccess={handleLogin} />}
            />
          ))}
          <Route path="*" element={<Navigate to={authEntryPoint?.route || '/login'} replace />} />
        </Routes>
      </div>
    );
  }

  const defaultPage = dashboardPage || pages[0];

  return (
    <div className="flex min-h-screen bg-background">
      <nav className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold tracking-tight">eager_tiger</h2>
        </div>
        <div className="flex-1 py-4 px-3 space-y-1 overflow-auto">
          {navigation.map((item, index) => (
            item.type === 'section' ? (
              <div key={index} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</div>
            ) : (
              <Link
                key={index}
                to={item.route}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActiveRoute(item.route)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon name={item.icon} /><span>{item.label}</span>
              </Link>
            )
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="mb-3">
            <span className="text-sm font-medium">{user?.name || user?.email || 'User'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>Sign Out</Button>
        </div>
      </nav>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={defaultPage ? <Navigate to={defaultPage.route} replace /> : <div className="flex flex-col items-center justify-center h-full"><h2 className="text-2xl font-semibold">Welcome to eager_tiger</h2><p className="text-muted-foreground mt-2">No pages configured.</p></div>} />
          {pages.map(page => (
            <Route
              key={page.id}
              path={page.route}
              element={
                <PageRenderer
                  page={page}
                  forms={forms}
                  initialData={page.route === initialState?.route ? initialPageData : null}
                />
              }
            />
          ))}
          {navigation.filter(n => !n.pageExists).map((item, i) => <Route key={`fb-${i}`} path={item.route} element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{item.label}</h2><p className="text-muted-foreground mt-2">Page under construction.</p></div>} />)}
          <Route path="*" element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">Page Not Found</h2><Link to="/" className="text-primary hover:underline mt-2">Go to Dashboard</Link></div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;