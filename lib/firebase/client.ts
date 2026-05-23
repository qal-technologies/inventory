import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAOq_Z3Q0W0K6RZjmFpon1nevwGMhMO_DA',
  authDomain: 'inventory-app-x.firebaseapp.com',
  projectId: 'inventory-app-x',
  storageBucket: 'inventory-app-x.firebasestorage.app',
  messagingSenderId: '69681315012',
  appId: '1:69681315012:web:6a7018709c8c32c0605d91',
  measurementId: 'G-FYD4Q202PP',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
