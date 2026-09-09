// رموز وصول عالية العشوائية للطالب (نتيجة اختبار / متابعة حجز).
// يُخزَّن التجزئة فقط، فتسريب قاعدة البيانات لا يمنح وصولاً.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 بايت = 256 بت من العشوائية، بترميز base64url. */
export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** مقارنة ثابتة الزمن لتفادي تسريب المعلومة عبر توقيت الاستجابة. */
export function tokensMatch(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
