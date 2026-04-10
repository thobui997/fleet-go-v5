import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import { validateEnv } from './shared/lib/validate-env';
import { ErrorBoundary } from './shared/ui/error-boundary';
import './app/styles/index.css';

// Fail fast with clear message if env is misconfigured
validateEnv();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
