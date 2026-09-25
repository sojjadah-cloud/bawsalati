import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireStaff, assertSameOrigin } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { resourceSchema } from "@/features/library/schemas";

const patchSchema = z.union([
  resourceSchema.and(z.object({ kind: z.literal("full") })),
  z.object({ kind: z.literal("archive"), archived: z.boolean() }),
  z.object({ kind: z.literal("publish"), published: z.boolean() }),
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    const { id } = await params;
    const body = await parseBody(req, patchSchema);

    if (body.kind === "archive") {
      await prisma.libraryResource.update({
        where: { id },
        data: { archivedAt: body.archived ? new Date() : null, published: body.archived ? false : undefined },
      });
      await audit(body.archived ? "RESOURCE_ARCHIVE" : "RESOURCE_RESTORE", "LibraryResource", {
        actor: session,
        entityId: id,
        ip: clientIp(req),
      });
      return json({ ok: true });
    }

    if (body.kind === "publish") {
      await prisma.libraryResource.update({
        where: { id },
        data: { published: body.published },
      });
      await audit("RESOURCE_PUBLISH", "LibraryResource", {
        actor: session,
        entityId: id,
        meta: { published: body.published },
        ip: clientIp(req),
      });
      return json({ ok: true });
    }

    await prisma.libraryResource.update({
      where: { id },
      data: {
        categoryId: body.categoryId,
        title: body.title,
        description: body.description || "",
        type: body.type,
        author: body.author || "",
        publisher: body.publisher || null,
        publishedYear: body.publishedYear ?? null,
        language: body.language || "ar",
        coverUrl: body.coverUrl || null,
        coverFileId: body.coverFileId || null,
        externalUrl: body.externalUrl || null,
        fileId: body.fileId || null,
        audioFileId: body.audioFileId || null,
        downloadable: body.downloadable ?? true,
        featured: body.featured ?? false,
        published: body.published ?? true,
      },
    });

    await audit("RESOURCE_UPDATE", "LibraryResource", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

/** حذف نهائي. متاح للأخصائي والمدير معاً. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const session = await requireStaff();
    const { id } = await params;
    await prisma.libraryResource.delete({ where: { id } });
    await audit("RESOURCE_DELETE", "LibraryResource", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
