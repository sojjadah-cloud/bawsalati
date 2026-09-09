import type { Metadata } from "next";
import { requireSpecialist } from "@/lib/api";
import { PageHeading } from "@/components/ui/primitives";
import { AvailabilityManager } from "@/components/dashboard/AvailabilityManager";

export const metadata: Metadata = {
  title: "الأوقات المتاحة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  await requireSpecialist();
  return (
    <>
      <PageHeading
        title="الأوقات المتاحة"
        description="حدّد فترات دوامك الأسبوعية والأيام غير المتاحة. الطلاب يرون الفترات الحرّة فقط."
      />
      <div className="mt-6">
        <AvailabilityManager />
      </div>
    </>
  );
}
