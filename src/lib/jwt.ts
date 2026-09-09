// أدوات الجلسة الصالحة في بيئة Edge (تُستخدم من proxy.ts) — بلا اعتماديات Node.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bawsalati_session";

export type Role = "ADMIN" | "SPECIALIST";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** معرّف ملف المختص — موجود فقط لدور SPECIALIST */
  specialistId?: string;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET غير مضبوط أو أقصر من 32 حرفاً");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.id || !payload.role) return null;
    const role = payload.role;
    if (role !== "ADMIN" && role !== "SPECIALIST") return null;
    return {
      id: String(payload.id),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role,
      specialistId: payload.specialistId ? String(payload.specialistId) : undefined,
    };
  } catch {
    return null;
  }
}
