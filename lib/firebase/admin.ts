import admin from 'firebase-admin';

function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }

  // If credentials are missing or placeholder, skip initialization
  if (!projectId || !clientEmail || !privateKey || privateKey.includes('YOUR_KEY_HERE')) {
    console.warn('[Firebase Admin] Missing or placeholder credentials — skipping initialization');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } catch (err) {
    console.error('[Firebase Admin] Init failed:', err);
  }
}

initAdmin();

// Safe getters — return null if admin isn't initialized
export function getAdminDb() {
  if (!admin.apps.length) return null;
  return admin.firestore();
}

export function getAdminAuth() {
  if (!admin.apps.length) return null;
  return admin.auth();
}

// Legacy exports for backward compat (will throw if not initialized)
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    const db = getAdminDb();
    if (!db) throw new Error('Firebase Admin not initialized — check your .env.local credentials');
    return (db as unknown as Record<string, unknown>)[prop as string];
  },
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    const auth = getAdminAuth();
    if (!auth) throw new Error('Firebase Admin not initialized — check your .env.local credentials');
    return (auth as unknown as Record<string, unknown>)[prop as string];
  },
});

export default admin;
