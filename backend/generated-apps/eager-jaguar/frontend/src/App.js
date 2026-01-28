import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import PageRenderer from './components/PageRenderer';
import { formsApi, setAuthToken, workflowApi } from './api/client';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
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

// Protected Route wrapper
const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [pages, setPages] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigation, setNavigation] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Workflow state for navigation control
  const [workflowInstance, setWorkflowInstance] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [workflowNavigation, setWorkflowNavigation] = useState(null);

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

  // Always load pages first to determine if there are auth pages to show
  useEffect(() => { loadAppData(); }, []);

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

  // Workflow navigation handler - navigates based on workflow response
  const handleWorkflowNavigation = useCallback((navInfo) => {
    if (!navInfo) return;

    setWorkflowNavigation(navInfo);

    // If workflow specifies a page to navigate to
    if (navInfo.nextPageId) {
      const targetPage = pages.find(p => p.id === navInfo.nextPageId || p.name === navInfo.nextPageId);
      if (targetPage) {
        navigate(targetPage.route);
        return;
      }
    }

    // If workflow completed, navigate to completion page or dashboard
    if (navInfo.workflowComplete) {
      if (navInfo.completionPageId) {
        const completionPage = pages.find(p => p.id === navInfo.completionPageId);
        if (completionPage) {
          navigate(completionPage.route);
          return;
        }
      }
      // Clear workflow state and go to dashboard
      setWorkflowInstance(null);
      setCurrentTask(null);
      navigate('/dashboard');
    }

    // If there's a next task, update current task
    if (navInfo.nextTask) {
      setCurrentTask(navInfo.nextTask);
    }
  }, [pages, navigate]);

  // Start a workflow and handle navigation
  const startWorkflow = useCallback(async (workflowId, inputData = {}) => {
    try {
      const response = await workflowApi.start(workflowId, inputData);
      const { instance, navigation: navInfo } = response.data || response;

      setWorkflowInstance(instance);

      // Navigate to initial page if specified
      if (navInfo?.initialPageId) {
        const initialPage = pages.find(p => p.id === navInfo.initialPageId);
        if (initialPage) {
          navigate(initialPage.route);
        }
      }

      return { instance, navigation: navInfo };
    } catch (error) {
      console.error('Failed to start workflow:', error);
      throw error;
    }
  }, [pages, navigate]);

  // Complete a task and handle navigation
  const completeTask = useCallback(async (taskId, formData) => {
    if (!workflowInstance) {
      console.error('No active workflow instance');
      return;
    }

    try {
      const response = await workflowApi.completeTask(workflowInstance.id, taskId, formData);
      const { instance, navigation: navInfo } = response.data || response;

      setWorkflowInstance(instance);
      handleWorkflowNavigation(navInfo);

      return { instance, navigation: navInfo };
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  }, [workflowInstance, handleWorkflowNavigation]);

  // Form submission handler that integrates with workflow
  const handleFormSubmit = useCallback(async (formId, formData, options = {}) => {
    // If in workflow context with a current task, complete the task
    if (workflowInstance && currentTask) {
      return completeTask(currentTask.taskId, formData);
    }

    // If workflow should be started on form submit
    if (options.startWorkflow && options.workflowId) {
      return startWorkflow(options.workflowId, formData);
    }

    // Otherwise, just submit the form normally
    try {
      const response = await formsApi.submit(formId, formData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit form:', error);
      throw error;
    }
  }, [workflowInstance, currentTask, completeTask, startWorkflow]);

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

  // Show loading while checking auth
  if (!authChecked) {
    return <div className="flex items-center justify-center h-screen bg-background"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-muted-foreground">Loading...</p></div></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-background"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-muted-foreground">Loading eager_jaguar...</p></div></div>;
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
      <nav className="border-r bg-card flex flex-col" style={{ width: '256px' }}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold tracking-tight">eager_jaguar</h2>
        </div>
        <div className="flex-1 py-4 px-3 space-y-1 overflow-auto">
          {navigation.map((item, index) => (
            item.type === 'section' ? (
              <div key={index} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</div>
            ) : (
              <Link key={index} to={item.route} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActiveRoute(item.route) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
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
      <main className="flex-1 overflow-auto" style={{ padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={defaultPage ? <Navigate to={defaultPage.route} replace /> : <div className="flex flex-col items-center justify-center h-full"><h2 className="text-2xl font-semibold">Welcome to eager_jaguar</h2><p className="text-muted-foreground mt-2">No pages configured.</p></div>} />
          {pages.map(page => <Route key={page.id} path={page.route} element={<PageRenderer page={page} forms={forms} workflowContext={{ instance: workflowInstance, currentTask, startWorkflow, completeTask, onFormSubmit: handleFormSubmit }} />} />)}
          {navigation.filter(n => !n.pageExists).map((item, i) => <Route key={`fb-${i}`} path={item.route} element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{item.label}</h2><p className="text-muted-foreground mt-2">Page under construction.</p></div>} />)}
          <Route path="*" element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">Page Not Found</h2><Link to="/" className="text-primary hover:underline mt-2">Go to Dashboard</Link></div>} />
        </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;