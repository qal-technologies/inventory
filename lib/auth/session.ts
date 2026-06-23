import { cookies } from 'next/headers';

const SESSION_COOKIE = 'inv_session';
const BRANCH_COOKIE = 'inv_branch';

export interface SessionPayload {
  uid: string;
  role: 'admin' | 'staff';
  name: string;
  email: string;
  deviceToken?: string;
}

export interface BranchSession {
  branchId: string;
  branchName: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  cookieStore.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, 
  });
}

export async function getBranchSession(): Promise<BranchSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(BRANCH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as BranchSession;
  } catch {
    return null;
  }
}

export async function setBranchSession(payload: BranchSession): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  cookieStore.set(BRANCH_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 3650,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(BRANCH_COOKIE);
}
