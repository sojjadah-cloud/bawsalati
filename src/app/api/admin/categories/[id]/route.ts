import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  parseBody,
  requireAdmin,
  assertSameOrigin,
  ApiError,
} from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  displayOrder: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const input = await parseBody(req, patchSchema);

    await prisma.libraryCategory.update({ where: { id }, data: input });
    await audit("CATEGORY_UPDATE", "LibraryCategory", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

/** التصنيف الذي يحوي موارد لا يُحذف — يُعطَّل بدل ذلك حفاظاً على الموارد. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const session = await requireAdmin();
    const { id } = await params;

    const used = await prisma.libraryResource.count({ where: { categoryId: id } });
    if (used > 0) {
      throw new ApiError("لا يمكن حذف تصنيف يحوي موارد — عطّله بدلاً من ذلك", 409);
    }

    await prisma.libraryCategory.delete({ where: { id } });
    await audit("CATEGORY_DELETE", "LibraryCategory", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
