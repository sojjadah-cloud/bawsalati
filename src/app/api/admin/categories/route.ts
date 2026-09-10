import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireAdmin } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { categorySchema } from "@/features/library/schemas";

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const input = await parseBody(req, categorySchema);

    const category = await prisma.libraryCategory.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description || "",
        displayOrder: input.displayOrder ?? 0,
        active: input.active ?? true,
      },
      select: { id: true, name: true },
    });

    await audit("CATEGORY_CREATE", "LibraryCategory", {
      actor: session,
      entityId: category.id,
      ip: clientIp(req),
    });
    return json({ category }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
