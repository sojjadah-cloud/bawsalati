import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireStaff, assertSameOrigin } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { invalidateFaqCache } from "@/features/faq/service";
import { faqSchema, parseKeywords } from "../route";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    const { id } = await params;
    const input = await parseBody(req, faqSchema);

    await prisma.faqEntry.update({
      where: { id },
      data: {
        question: input.question,
        answer: input.answer,
        keywords: parseKeywords(input.keywords),
        topic: input.topic || "",
        active: input.active ?? true,
      },
    });

    invalidateFaqCache();
    await audit("FAQ_UPDATE", "FaqEntry", { actor: session, entityId: id, ip: clientIp(req) });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const session = await requireStaff();
    const { id } = await params;

    await prisma.faqEntry.delete({ where: { id } });
    invalidateFaqCache();
    await audit("FAQ_DELETE", "FaqEntry", { actor: session, entityId: id, ip: clientIp(req) });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
