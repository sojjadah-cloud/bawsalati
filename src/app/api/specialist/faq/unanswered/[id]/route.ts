import { prisma } from "@/lib/prisma";
import { json, errorResponse, requireStaff, assertSameOrigin } from "@/lib/api";

/** إخفاء سؤال غير مُجاب بعد معالجته أو تجاهله. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    await requireStaff();
    const { id } = await params;
    await prisma.unansweredQuestion.update({
      where: { id },
      data: { resolved: true },
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
