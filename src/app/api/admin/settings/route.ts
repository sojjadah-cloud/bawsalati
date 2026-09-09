import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireAdmin } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";

const settingsSchema = z.object({
  entries: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        value: z.string().trim().max(1000),
      })
    )
    .min(1)
    .max(50),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireAdmin();
    const { entries } = await parseBody(req, settingsSchema);

    await prisma.$transaction(
      entries.map((e) =>
        prisma.setting.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value },
        })
      )
    );

    await audit("SETTINGS_UPDATE", "Setting", {
      actor: session,
      meta: { keys: entries.map((e) => e.key) },
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
