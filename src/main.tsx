import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';
import 'sonner/dist/styles.css';
import { RepositoryFactory } from './core/infrastructure/repositories/repository.factory';

// Initialize Repository Factory with local SQLite mode
RepositoryFactory.setMode('local');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
