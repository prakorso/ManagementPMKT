import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from '@/context/ThemeContext';
import { DataProvider } from '@/context/DataContext';
import { SessionProvider } from '@/context/SessionContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <DataProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </DataProvider>
    </ThemeProvider>
  </StrictMode>,
);
