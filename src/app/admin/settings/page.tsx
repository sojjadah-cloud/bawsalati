import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { PageHeading } from "@/components/ui/primitives";
import { SettingsForm, type SettingField } from "@/components/admin/SettingsForm";

export const metadata: Metadata = {
  title: "إعدادات المنصة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FIELDS: SettingField[] = [
  { key: "site.title", label: "عنوان المنصة" },
  { key: "site.description", label: "الوصف المختصر", multiline: true },
  { key: "site.email", label: "البريد الإلكتروني للتواصل", dir: "ltr" },
  { key: "site.phone", label: "رقم التواصل المعلن", dir: "ltr" },
  {
    key: "booking.horizonDays",
    label: "مدى الحجز بالأيام",
    hint: "أقصى عدد أيام يمكن للطالب الحجز خلالها.",
    dir: "ltr",
  },
];

export default async function AdminSettingsPage() {
  await requireAdmin();
  const rows = await prisma.setting.findMany({ select: { key: true, value: true } });
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <>
      <PageHeading
        title="إعدادات المنصة"
        description="بيانات عامة تظهر في الموقع وتضبط سلوك الحجز."
      />
      <div className="mt-6 max-w-2xl">
        <SettingsForm fields={FIELDS} values={values} />
      </div>
    </>
  );
}
