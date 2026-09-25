import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireAdmin } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().trim().min(3, "أدخل الاسم").max(120),
  email: z.string().trim().toLowerCase().email("أدخل بريداً صحيحاً"),
  password: z
    .string()
    .min(10, "كلمة المرور 10 محارف على الأقل")
    .regex(/[A-Za-z]/u, "أضف حرفاً لاتينياً واحداً على الأقل")
    .regex(/\d/u, "أضف رقماً واحداً على الأقل"),
  role: z.enum(["ADMIN", "SPECIALIST"]),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  notifyPhone: z
    .string()
    .trim()
    .regex(/^\d{8,15}$/u, "رقم غير صحيح")
    .optional()
    .or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const input = await parseBody(req, createSchema);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        ...(input.role === "SPECIALIST"
          ? {
              specialistProfile: {
                create: {
                  title: input.title || "أخصائي التوجيه المهني",
                  notifyPhone: input.notifyPhone || null,
                },
              },
            }
          : {}),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await audit("USER_CREATE", "User", {
      actor: session,
      entityId: user.id,
      meta: { role: input.role },
      ip: clientIp(req),
    });
    return json({ user }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
