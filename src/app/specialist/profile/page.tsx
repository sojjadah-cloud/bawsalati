import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSpecialist } from "@/lib/api";
import { PageHeading } from "@/components/ui/primitives";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export const metadata: Metadata = {
  title: "الملف الشخصي",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSpecialist();
  const profile = await prisma.specialistProfile.findUnique({
    where: { id: session.specialistId },
    select: {
      title: true,
      bio: true,
      notifyPhone: true,
      bookable: true,
      slotMinutes: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!profile) notFound();

  return (
    <>
      <PageHeading
        title="الملف الشخصي"
        description="بياناتك كما تظهر للطلاب، ورقم إشعار الحجز الخاص بك."
      />

      <dl className="card card-pad mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--color-muted)]">الاسم</dt>
          <dd className="mt-0.5 text-sm font-bold text-slate-900">{profile.user.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-muted)]">البريد الإلكتروني</dt>
          <dd className="mt-0.5 text-sm font-bold text-slate-900" dir="ltr">
            {profile.user.email}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-[var(--color-faint)]">
        لتغيير الاسم أو كلمة المرور تواصل مع مدير النظام.
      </p>

      <div className="mt-6">
        <ProfileForm
          initial={{
            title: profile.title,
            bio: profile.bio,
            notifyPhone: profile.notifyPhone ?? "",
            bookable: profile.bookable,
            slotMinutes: profile.slotMinutes,
          }}
        />
      </div>
    </>
  );
}
