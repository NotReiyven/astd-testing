/*
 * src/components/EnvMissingScreen.tsx
 * Simple fallback UI when required env vars are missing.
 */

import React from 'react';
import { useToastStore } from '../store/useToastStore';
import { logger } from '../lib/logger';

export const EnvMissingScreen: React.FC = () => {
  // Show a toast with a friendly message.
  const addToast = useToastStore((s) => s.addToast);

  React.useEffect(() => {
    const message =
      'Required environment configuration is missing. The app is running in limited guest mode.';
    logger.error('ASTD-ENV-001', message);
    addToast(message, 'error', { duration: 10000 });
  }, [addToast]);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: '2rem',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '4rem auto',
        border: '1px solid #e00',
        borderRadius: '8px',
        backgroundColor: '#ffe5e5',
      }}
    >
      <h1 style={{ marginBottom: '1rem' }}>Configuration Error</h1>
      <p>
        The required environment variables <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> are not set. The application will run in a
        limited guest mode with read‑only features.
      </p>
    </div>
  );
};
