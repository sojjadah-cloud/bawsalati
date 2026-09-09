import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { PageHeading } from "@/components/ui/primitives";
import { SpecialistManager } from "@/components/admin/SpecialistManager";

export const metadata: Metadata = {
  title: "المختصون",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSpecialistsPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLoginAt: true,
      specialistProfile: { select: { bookable: true } },
    },
  });

  return (
    <>
      <PageHeading
        title="المختصون وحسابات الإدارة"
        description="إنشاء الحسابات وتفعيلها وإعادة ضبط كلمات المرور."
      />
      <div className="mt-6">
        <SpecialistManager
          currentUserId={session.id}
          accounts={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            active: u.active,
            lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
            bookable: u.specialistProfile?.bookable ?? null,
          }))}
        />
      </div>
    </>
  );
}
