import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { getPublishedGuide } from "@/features/guide/service";
import { EmptyState } from "@/components/ui/primitives";
import { GuideReader } from "@/components/library/GuideReader";
import { PageHero } from "@/components/public/PageHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دليل الطالب",
  description:
    "الدليل الرسمي للتخصصات والبرامج الدراسية وشروط القبول، متاح للقراءة داخل المنصة.",
};

export default async function GuidePage() {
  const guide = await getPublishedGuide();

  if (!guide) {
    return (
      <div className="container-narrow py-14">
        <h1 className="section-title text-center">دليل الطالب</h1>
        <div className="mt-6">
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="الدليل غير متاح حالياً"
            description="لم يُنشر إصدار من الدليل بعد. يمكنك حجز موعد مع مختص التوجيه المهني للحصول على المعلومات التي تحتاجها."
            action={
              <Link href="/booking" className="btn-primary">
                احجز موعداً
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const hasContent = !!guide.file || !!guide.externalUrl;

  return (
    <>
      <PageHero
        title={guide.title}
        description={guide.description || undefined}
        action={
          guide.downloadable && guide.file ? (
            <a href="/api/files/guide?mode=download" className="btn-secondary">
              <Download className="h-5 w-5" aria-hidden="true" />
              تنزيل الدليل
            </a>
          ) : undefined
        }
      />

      <div className="container-x py-10 sm:py-14">
        {hasContent ? (
          <GuideReader
            hasFile={!!guide.file}
            externalUrl={guide.externalUrl}
            title={guide.title}
          />
        ) : (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="لم يُرفق ملف الدليل بعد"
            description="سيُرفع الدليل قريباً من قِبل إدارة المنصة."
          />
        )}

        <p className="mt-6 text-xs text-[var(--color-faint)]">
          الإصدار {guide.version}
          {guide.publishedAt
            ? ` · نُشر في ${guide.publishedAt.toISOString().slice(0, 10)}`
            : null}
        </p>
      </div>
    </>
  );
}
