import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, UserRound } from "lucide-react";
import { getAppointmentByToken } from "@/features/appointments/service";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { formatArabicDate, formatArabicTime, utcToIsoDate } from "@/lib/time";
import { Alert, Badge, type BadgeTone } from "@/components/ui/primitives";
import { PageHero } from "@/components/public/PageHero";

// صفحة خاصة بحجز طالب — لا تُفهرس.
export const metadata: Metadata = {
  title: "متابعة حجزك",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

const NOTE: Record<string, string> = {
  PENDING: "وصل طلبك إلى الأخصائي، وسيؤكّده قريباً.",
  CONFIRMED: "موعدك مؤكّد. احضر في الوقت المحدّد.",
  COMPLETED: "تمّت الاستشارة. يمكنك حجز موعد آخر متى احتجت.",
  CANCELLED: "أُلغي هذا الموعد. يمكنك حجز موعد جديد.",
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appointment = await getAppointmentByToken(decodeURIComponent(token));
  if (!appointment) notFound();

  const date = utcToIsoDate(appointment.scheduledDate);

  return (
    <>
      <PageHero
        title="متابعة حجزك"
        description="حالة موعدك مع أخصائي التوجيه المهني."
        back={{ href: "/", label: "رجوع إلى الرئيسية" }}
      />

      <div className="container-narrow py-10 sm:py-14">
        <div className="card card-pad">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-bold text-slate-900">{appointment.studentName}</p>
            <Badge tone={TONE[appointment.status] ?? "neutral"}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            {[
              {
                icon: CalendarDays,
                label: "التاريخ",
                value: formatArabicDate(date),
              },
              {
                icon: Clock,
                label: "الوقت",
                value: `${formatArabicTime(appointment.startTime)} — ${formatArabicTime(appointment.endTime)}`,
              },
              {
                icon: UserRound,
                label: "الأخصائي",
                value: `${appointment.specialist.user.name} · ${appointment.specialist.title}`,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <row.icon className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <dt className="text-[var(--color-muted)]">{row.label}</dt>
                <dd className="font-bold text-slate-900">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 shrink-0" aria-hidden="true" />
              <dt className="text-[var(--color-muted)]">الموضوع</dt>
              <dd className="font-bold text-slate-900">{appointment.topic.name}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <Alert tone={appointment.status === "CANCELLED" ? "warning" : "info"}>
              {NOTE[appointment.status]}
            </Alert>
          </div>
        </div>

        <p className="mt-6 text-sm text-[var(--color-muted)]">
          احتفظ برابط هذه الصفحة لمتابعة حالة موعدك. لتعديل الموعد أو إلغائه تواصل مع
          أخصائي التوجيه المهني.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/booking" className="btn-outline">
            حجز موعد آخر
          </Link>
          <Link href="/" className="btn-ghost">
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </>
  );
}
