// كوكي محاولة الاختبار: يربط المتصفّح بجلسة الطالب دون حساب.
// httpOnly حتى لا تصل نصوص الصفحة إلى الرمز.
import { cookies } from "next/headers";

export const ATTEMPT_COOKIE = "bawsalati_attempt";
const MAX_AGE_SECONDS = 60 * 60 * 6; // 6 ساعات — تكفي لإكمال الاختبار

export async function setAttemptCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(ATTEMPT_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getAttemptToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ATTEMPT_COOKIE)?.value ?? null;
}

export async function clearAttemptCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ATTEMPT_COOKIE);
}
