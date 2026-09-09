import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/api";
import { listGuideVersions } from "@/features/guide/service";
import { Badge, EmptyState, PageHeading } from "@/components/ui/primitives";
import { GuidePublisher } from "@/components/admin/GuidePublisher";

export const metadata: Metadata = {
  title: "دليل الطالب",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminGuidePage() {
  await requireAdmin();
  const versions = await listGuideVersions();
  const current = versions.find((v) => v.published);

  return (
    <>
      <PageHeading
        title="دليل الطالب"
        description="الدليل يُدار من هنا، فتحديثه لا يتطلّب أي تعديل على الموقع."
        action={
          current ? (
            <Link href="/guide" className="btn-outline btn-sm">
              عرض صفحة الدليل
            </Link>
          ) : undefined
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GuidePublisher defaultTitle={current?.title ?? "دليل الطالب"} />

        <section aria-labelledby="versions">
          <h2 id="versions" className="mb-3 text-base font-bold text-slate-900">
            الإصدارات
          </h2>
          {versions.length === 0 ? (
            <EmptyState
              title="لم يُنشر أي إصدار بعد"
              description="ارفع ملف الدليل لتفعيل صفحة دليل الطالب."
            />
          ) : (
            <ul className="card divide-y divide-[var(--color-line)]">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {v.title}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      الإصدار {v.version}
                      {v.publishedAt ? ` · ${v.publishedAt.toISOString().slice(0, 10)}` : ""}
                      {v.downloadable ? " · يسمح بالتنزيل" : " · قراءة فقط"}
                    </span>
                  </span>
                  {v.published ? <Badge tone="success">منشور</Badge> : <Badge>سابق</Badge>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
