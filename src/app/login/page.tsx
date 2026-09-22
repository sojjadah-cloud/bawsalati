import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { getSession } from "@/lib/auth";
import { LoginForm, type DevAccount } from "@/components/auth/LoginForm";
import { PartnersStrip } from "@/components/public/PartnersStrip";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * حسابات التعبئة السريعة تُبنى في الخادم، وتبقى فارغة في الإنتاج،
 * فلا تصل كلمة مرور إلى حزمة المتصفّح عند النشر.
 */
function devAccounts(): DevAccount[] {
  if (process.env.NODE_ENV === "production") return [];
  const password = process.env.SEED_PASSWORD || "Bawsalati@2026";
  return [
    { label: "مدير النظام", email: "admin@bawsalati.om", password },
    { label: "مختص التوجيه", email: "naeem@bawsalati.om", password },
  ];
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin" : "/specialist");

  const { next } = await searchParams;
  // يُقبل مسار داخلي فقط — لا إعادة توجيه إلى نطاق خارجي.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <>
      <PartnersStrip />
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-canvas p-4">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 flex items-center justify-center gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-brand-700 text-white">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              بوصلتي
            </span>
          </Link>

          <div className="card p-6 sm:p-8">
            <h1 className="text-xl font-extrabold text-slate-900">
              تسجيل دخول المختصين
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              هذه الصفحة مخصّصة لمختصي التوجيه المهني وإدارة المنصة. الطلاب لا
              يحتاجون حساباً لاستخدام خدمات بوصلتي.
            </p>

            <div className="mt-6">
              <LoginForm nextPath={safeNext} devAccounts={devAccounts()} />
            </div>
          </div>

          <p className="mt-6 text-center text-sm">
            <Link
              href="/"
              className="text-[var(--color-muted)] transition-colors hover:text-brand-700"
            >
              العودة إلى بوصلتي
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
