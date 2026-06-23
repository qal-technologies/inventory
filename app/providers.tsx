'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 600_000,
            gcTime: 900_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(255,255,255,0.95)',
            color: '#1F1F1F',
            border: '1px solid rgba(247,169,184,0.3)',
            borderRadius: '14px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(247,169,184,0.2)',
          },
          success: { iconTheme: { primary: '#34D399', secondary: '#fff' } },
          error: { iconTheme: { primary: '#F87171', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
