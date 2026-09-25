import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireStaff } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { resourceSchema } from "@/features/library/schemas";

export async function POST(req: Request) {
  try {
    const session = await requireStaff();
    const input = await parseBody(req, resourceSchema);

    const created = await prisma.libraryResource.create({
      data: {
        categoryId: input.categoryId,
        title: input.title,
        description: input.description || "",
        type: input.type,
        author: input.author || "",
        publisher: input.publisher || null,
        publishedYear: input.publishedYear ?? null,
        language: input.language || "ar",
        coverUrl: input.coverUrl || null,
        coverFileId: input.coverFileId || null,
        externalUrl: input.externalUrl || null,
        fileId: input.fileId || null,
        audioFileId: input.audioFileId || null,
        downloadable: input.downloadable ?? true,
        featured: input.featured ?? false,
        published: input.published ?? true,
        createdById: session.id,
      },
      select: { id: true, title: true },
    });

    await audit("RESOURCE_CREATE", "LibraryResource", {
      actor: session,
      entityId: created.id,
      meta: { type: input.type },
      ip: clientIp(req),
    });
    return json({ resource: created }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
