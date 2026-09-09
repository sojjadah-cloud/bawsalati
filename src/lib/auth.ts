// جلسات الخادم: كوكي httpOnly + تجزئة كلمات المرور.
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  type Role,
  type SessionUser,
} from "./jwt";

export { SESSION_COOKIE, signSession, verifySession };
export type { Role, SessionUser };

const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 ساعة
const BCRYPT_ROUNDS = 12;

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

export function comparePassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Strict يمنع إرسال الكوكي مع أي طلب قادم من موقع آخر — خط دفاع أساسي ضد CSRF.
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function hasRole(user: SessionUser | null, roles: Role[]): boolean {
  return !!user && roles.includes(user.role);
}
