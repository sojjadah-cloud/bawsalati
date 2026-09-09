import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, ApiError } from "@/lib/api";
import { comparePassword, setSessionCookie } from "@/lib/auth";
import { consume, reset, LIMITS } from "@/lib/rate-limit";
import { audit, clientIp } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("أدخل بريداً إلكترونياً صحيحاً"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export async function POST(req: Request) {
  try {
    const { email, password } = await parseBody(req, loginSchema);
    const ip = clientIp(req);

    const limit = consume(`login:${ip}:${email}`, LIMITS.login);
    if (!limit.allowed) {
      await audit("LOGIN_BLOCKED", "User", { meta: { email }, ip });
      throw new ApiError(
        `تجاوزت عدد المحاولات المسموح بها. حاول بعد ${Math.ceil(limit.retryAfterSeconds / 60)} دقيقة.`,
        429
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        passwordHash: true,
        specialistProfile: { select: { id: true } },
      },
    });

    // رسالة واحدة لكل حالات الفشل — لا تكشف وجود الحساب من عدمه.
    const invalid = new ApiError("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);

    if (!user || !user.active) {
      // مقارنة وهمية تُبقي زمن الاستجابة متقارباً
      await comparePassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
      await audit("LOGIN_FAILED", "User", { meta: { email }, ip });
      throw invalid;
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      await audit("LOGIN_FAILED", "User", { meta: { email }, ip });
      throw invalid;
    }

    reset(`login:${ip}:${email}`);

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      specialistId: user.specialistProfile?.id,
    };
    await setSessionCookie(sessionUser);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit("LOGIN_SUCCESS", "User", { actor: sessionUser, entityId: user.id, ip });

    return json({
      user: { name: user.name, role: user.role },
      redirectTo: user.role === "ADMIN" ? "/admin" : "/specialist",
    });
  } catch (e) {
    return errorResponse(e);
  }
}
