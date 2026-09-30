import { createRoot } from 'react-dom/client';

import Root from './Root';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  
}).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
);
