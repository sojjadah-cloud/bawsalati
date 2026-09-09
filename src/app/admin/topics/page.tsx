import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { PageHeading } from "@/components/ui/primitives";
import { TopicManager } from "@/components/admin/TopicManager";

export const metadata: Metadata = {
  title: "مواضيع الاستشارة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTopicsPage() {
  await requireAdmin();

  const topics = await prisma.consultationTopic.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      requiresDetails: true,
      displayOrder: true,
      active: true,
      _count: { select: { appointments: true } },
    },
  });

  return (
    <>
      <PageHeading
        title="مواضيع الاستشارة"
        description="الخيارات التي يراها الطالب عند حجز موعد. الموضوع الذي يطلب تفاصيل يُظهر حقل نص إضافياً."
      />
      <div className="mt-6">
        <TopicManager
          topics={topics.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            requiresDetails: t.requiresDetails,
            displayOrder: t.displayOrder,
            active: t.active,
            usageCount: t._count.appointments,
          }))}
        />
      </div>
    </>
  );
}
