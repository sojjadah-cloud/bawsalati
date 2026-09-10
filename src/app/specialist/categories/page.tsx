import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSpecialist } from "@/lib/api";
import { PageHeading } from "@/components/ui/primitives";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = {
  title: "تصنيفات المكتبة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SpecialistCategoriesPage() {
  await requireSpecialist();

  const categories = await prisma.libraryCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      displayOrder: true,
      active: true,
      _count: { select: { resources: true } },
    },
  });

  return (
    <>
      <PageHeading
        title="تصنيفات المكتبة"
        description="أقسام المكتبة كما يراها الطالب. أضف تصنيفاً أو عدّله أو أخفه."
      />
      <div className="mt-6">
        <CategoryManager
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            displayOrder: c.displayOrder,
            active: c.active,
            resourceCount: c._count.resources,
          }))}
        />
      </div>
    </>
  );
}
