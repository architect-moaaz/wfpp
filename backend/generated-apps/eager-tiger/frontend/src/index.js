import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import App from './App';
import './index.css';
import './App.css';

const container = document.getElementById('root');
const isSSR = window.__SSR__ === true;

const AppWithProviders = (
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if (isSSR && container.hasChildNodes()) {
  // Hydrate when we have SSR content
  ReactDOM.hydrateRoot(container, AppWithProviders);
} else {
  // Normal render for client-only
  const root = ReactDOM.createRoot(container);
  root.render(AppWithProviders);
}
