// عناصر الواجهة الأساسية. كل صفحة تركّب من هنا ولا تخترع أنماطاً جديدة.
import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";

/* ───────────────────────── مؤشّر التحميل ───────────────────────── */

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
  );
}

/* ───────────────────────── هيكل التحميل ───────────────────────── */

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="جارِ التحميل">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
      <span className="sr-only">جارِ تحميل المحتوى</span>
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="جارِ التحميل"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
      <span className="sr-only">جارِ تحميل المحتوى</span>
    </div>
  );
}

/* ───────────────────────── الحالات ───────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-strong)] bg-white px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-bold text-slate-800">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-[var(--color-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "تعذّر تحميل البيانات",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-danger-600/25 bg-danger-50 px-6 py-12 text-center"
    >
      <AlertCircle className="mb-3 h-8 w-8 text-danger-600" aria-hidden="true" />
      <p className="text-base font-bold text-danger-700">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-danger-700/80">{description}</p>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-outline mt-5">
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
}

/* ───────────────────────── التنبيهات ───────────────────────── */

const ALERT_STYLES = {
  info: { cls: "border-info-600/25 bg-info-50 text-info-700", Icon: Info },
  success: { cls: "border-success-600/25 bg-success-50 text-success-700", Icon: CheckCircle2 },
  warning: { cls: "border-warning-600/30 bg-warning-50 text-warning-700", Icon: AlertTriangle },
  danger: { cls: "border-danger-600/25 bg-danger-50 text-danger-700", Icon: AlertCircle },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof ALERT_STYLES;
  title?: string;
  children?: ReactNode;
}) {
  const { cls, Icon } = ALERT_STYLES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex gap-3 rounded-[var(--radius-md)] border p-4 text-sm ${cls}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={title ? "mt-1 leading-relaxed" : "leading-relaxed"}>{children}</div> : null}
      </div>
    </div>
  );
}

/* ───────────────────────── الشارات ───────────────────────── */

const BADGE_TONES = {
  neutral: "badge-neutral",
  brand: "badge-brand",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

/** الحالة تُنقل بالنص واللون معاً — لا يُعتمد على اللون وحده. */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return <span className={BADGE_TONES[tone]}>{children}</span>;
}

/* ───────────────────────── شريط التقدّم ───────────────────────── */

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ───────────────────────── بطاقة إحصاء ───────────────────────── */

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-muted)]">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-[var(--color-faint)]">{hint}</p> : null}
        </div>
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-brand-50 text-brand-700">
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────────── ترويسة صفحة ───────────────────────── */

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
