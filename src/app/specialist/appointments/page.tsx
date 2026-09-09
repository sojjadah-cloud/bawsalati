import type { Metadata } from "next";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { requireSpecialist } from "@/lib/api";
import { listAppointments } from "@/features/specialist/service";
import {
  APPOINTMENT_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  GRADE_LABELS,
} from "@/lib/constants";
import { formatArabicDate, formatArabicTime, utcToIsoDate } from "@/lib/time";
import { Badge, EmptyState, PageHeading, type BadgeTone } from "@/components/ui/primitives";
import { FilterBar, Pagination } from "@/components/dashboard/FilterBar";
import { AppointmentActions } from "@/components/dashboard/AppointmentActions";

export const metadata: Metadata = {
  title: "الحجوزات",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const SCOPES = [
  { value: "today", label: "اليوم" },
  { value: "upcoming", label: "القادمة" },
  { value: "past", label: "السابقة" },
  { value: "all", label: "الكل" },
] as const;

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

const VALID_STATUS: AppointmentStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    status?: string;
    q?: string;
    date?: string;
    page?: string;
  }>;
}) {
  const session = await requireSpecialist();
  const sp = await searchParams;

  const scope = (SCOPES.find((s) => s.value === sp.scope)?.value ?? "upcoming") as
    | "today"
    | "upcoming"
    | "past"
    | "all";
  const status = VALID_STATUS.includes(sp.status as AppointmentStatus)
    ? (sp.status as AppointmentStatus)
    : undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const { items, total } = await listAppointments({
    specialistId: session.specialistId,
    scope,
    status,
    search: sp.q?.trim() || undefined,
    date: sp.date || undefined,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeading
        title="الحجوزات"
        description="متابعة مواعيد الاستشارة وتحديث حالتها."
        action={
          <Link href="/specialist/availability" className="btn-outline btn-sm">
            إدارة الأوقات المتاحة
          </Link>
        }
      />

      {/* نطاقات سريعة */}
      <nav aria-label="نطاق العرض" className="mt-5 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Link
            key={s.value}
            href={`/specialist/appointments?scope=${s.value}`}
            aria-current={scope === s.value ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              scope === s.value
                ? "bg-brand-700 text-white"
                : "border border-[var(--color-line-strong)] bg-white text-slate-600 hover:border-brand-400"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        <FilterBar
          searchPlaceholder="ابحث باسم الطالب"
          selects={[
            {
              name: "status",
              label: "الحالة",
              placeholder: "كل الحالات",
              options: VALID_STATUS.map((s) => ({
                value: s,
                label: APPOINTMENT_STATUS_LABELS[s],
              })),
            },
          ]}
          dateFields={[{ name: "date", label: "تاريخ محدّد" }]}
        />
      </div>

      <p className="mt-5 text-sm text-[var(--color-muted)]" aria-live="polite">
        {total === 0 ? "لا توجد حجوزات" : `${total} حجزاً`}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="لا توجد حجوزات في هذا النطاق"
            description="تأكّد من إتاحة أوقات في صفحة الأوقات المتاحة ليتمكّن الطلاب من الحجز."
            action={
              <Link href="/specialist/availability" className="btn-outline btn-sm">
                إدارة الأوقات
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((a) => {
            const delivery = a.deliveries[0];
            return (
              <li key={a.id} className="card card-pad">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{a.studentName}</h2>
                      <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                        {APPOINTMENT_STATUS_LABELS[a.status]}
                      </Badge>
                    </div>

                    <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                      {formatArabicDate(utcToIsoDate(a.scheduledDate))} ·{" "}
                      {formatArabicTime(a.startTime)} — {formatArabicTime(a.endTime)}
                    </p>

                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-[var(--color-muted)]">الصف:</dt>
                        <dd className="font-semibold">{GRADE_LABELS[a.grade] ?? a.grade}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-[var(--color-muted)]">الهاتف:</dt>
                        <dd className="font-semibold tabular-nums" dir="ltr">
                          {a.phone}
                        </dd>
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <dt className="text-[var(--color-muted)]">الموضوع:</dt>
                        <dd className="font-semibold">{a.topic.name}</dd>
                      </div>
                    </dl>

                    {a.topicDetails ? (
                      <p className="mt-3 rounded-[var(--radius-md)] bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                        {a.topicDetails}
                      </p>
                    ) : null}

                    {a.specialistNotes ? (
                      <p className="mt-2 rounded-[var(--radius-md)] border border-brand-100 bg-brand-50 p-3 text-sm leading-relaxed text-brand-900">
                        <span className="font-bold">ملاحظاتك: </span>
                        {a.specialistNotes}
                      </p>
                    ) : null}

                    {delivery && delivery.status !== "SENT" ? (
                      <p className="mt-2 text-xs font-semibold text-warning-700">
                        إشعار الحجز: {DELIVERY_STATUS_LABELS[delivery.status]}
                        {delivery.lastError ? ` — ${delivery.lastError}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <AppointmentActions
                      appointmentId={a.id}
                      status={a.status}
                      notes={a.specialistNotes}
                      studentName={a.studentName}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} className="mt-8" />
    </>
  );
}
