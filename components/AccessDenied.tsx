'use client';

import React from 'react';
import { WifiOff, RotateCw } from 'lucide-react';

export default function AccessDenied() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="auth-container" style={{ minHeight: '100vh', width: '100vw' }}>
      <div
        className="auth-card"
        style={{
          textAlign: 'center',
          maxWidth: '460px',
          padding: '40px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(248, 113, 113, 0.2)',
          }}
        >
          <WifiOff size={36} strokeWidth={2} />
        </div>

        <h1
          style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '28px',
          }}
        >
          The website encountered a domain or database error. Please contact your developer for further web analysis or fix.
        </p>

        <button
          onClick={handleReload}
          className="btn btn-primary"
          style={{
            width: '100%',
            height: '48px',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '0.95rem',
          }}
        >
          <RotateCw size={18} />
          <span>Reload Page</span>
        </button>
      </div>
    </div>
  );
}
