import toast from 'react-hot-toast';

/**
 * Parses raw system, firebase, or fetch errors into clean user-friendly alerts.
 */
export function getFriendlyErrorMessage(err: any, fallback = 'Action failed'): string {
  if (!err) return fallback;

  const msg = (err.message || String(err)).toLowerCase();

  // Network connection issues
  if (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('network-request-failed') ||
    msg.includes('network request failed') ||
    msg.includes('offline') ||
    msg.includes('load failed') ||
    msg.includes('typeerror: failed to fetch')
  ) {
    return '🔌 Network Error: Please check your internet connection and try again.';
  }

  // Security / Roles Access Denied
  if (
    msg.includes('permission-denied') ||
    msg.includes('permission denied') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('403') ||
    msg.includes('401')
  ) {
    return '🔒 Access Denied: You do not have permission for this workspace action.';
  }

  // Firestore indexing or capacity limits
  if (msg.includes('index') || msg.includes('indices') || msg.includes('composite')) {
    return '⚙️ Database Index Error: The database query requires a new index. Please build it or wait.';
  }
  if (msg.includes('firestore') || msg.includes('database') || msg.includes('quota') || msg.includes('unavailable')) {
    return '🗄️ Database Service Error: The database is temporarily unavailable. Please try again.';
  }

  // Firebase login errors
  if (
    msg.includes('auth/invalid-credential') ||
    msg.includes('invalid-email') ||
    msg.includes('wrong-password') ||
    msg.includes('user-not-found')
  ) {
    return '🔑 Invalid Login Credentials: Check your email and password.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return '📧 Email Already In Use: Try using a different email address.';
  }
  if (msg.includes('auth/weak-password')) {
    return '🛡️ Weak Password: Password must be at least 6 characters long.';
  }

  return err.message || fallback;
}

/**
 * Standardized hot-toast helper to render formatted errors.
 */
export function toastError(err: any, fallback?: string) {
  const message = getFriendlyErrorMessage(err, fallback);
  toast.error(message, {
    duration: 5000,
    style: {
      borderRadius: 'var(--radius-md)',
      background: '#1f1f1f',
      color: '#fff',
      fontSize: '0.875rem',
      fontWeight: 500,
      border: '1px solid var(--border)'
    }
  });
}
