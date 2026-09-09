import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireAdmin } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { topicSchema } from "@/features/appointments/schemas";

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const input = await parseBody(req, topicSchema);

    const topic = await prisma.consultationTopic.create({
      data: {
        name: input.name,
        slug: input.slug,
        requiresDetails: input.requiresDetails ?? false,
        displayOrder: input.displayOrder ?? 0,
        active: input.active ?? true,
      },
      select: { id: true, name: true },
    });

    await audit("TOPIC_CREATE", "ConsultationTopic", {
      actor: session,
      entityId: topic.id,
      ip: clientIp(req),
    });
    return json({ topic }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
