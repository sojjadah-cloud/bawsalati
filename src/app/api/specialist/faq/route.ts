import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireStaff } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { invalidateFaqCache } from "@/features/faq/service";

export const faqSchema = z.object({
  question: z.string().trim().min(5, "اكتب السؤال").max(300),
  answer: z.string().trim().min(5, "اكتب الجواب").max(3000),
  /** صيغ أخرى للسؤال، مفصولة بأسطر */
  keywords: z.string().trim().max(1000).optional().or(z.literal("")),
  topic: z.string().trim().max(80).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export function parseKeywords(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,،]/u)
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function POST(req: Request) {
  try {
    const session = await requireStaff();
    const input = await parseBody(req, faqSchema);

    const entry = await prisma.faqEntry.create({
      data: {
        question: input.question,
        answer: input.answer,
        keywords: parseKeywords(input.keywords),
        topic: input.topic || "",
        active: input.active ?? true,
      },
      select: { id: true, question: true },
    });

    invalidateFaqCache();
    await audit("FAQ_CREATE", "FaqEntry", {
      actor: session,
      entityId: entry.id,
      ip: clientIp(req),
    });
    return json({ entry }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
