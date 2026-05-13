import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';
import 'sonner/dist/styles.css';
import { RepositoryFactory } from './core/infrastructure/repositories/repository.factory';

// Initialize Repository Factory with local SQLite mode
RepositoryFactory.setMode('local');

// Dev-only perf harness: `?perf=N` reemplaza la app y renderiza DataTable con
// N facturas sintéticas, sin tocar DB ni Tauri. Para diagnosticar lag con
// playwright/browser sin requerir el runtime de Tauri.
const params = new URLSearchParams(window.location.search);
const perfRows = import.meta.env.DEV ? Number(params.get('perf') ?? '') : 0;

if (perfRows > 0) {
  // Lazy import — no se incluye en bundles de prod.
  import('./dev/PerfHarness').then(({ PerfHarness }) => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <PerfHarness rowCount={perfRows} />
      </React.StrictMode>
    );
  });
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
