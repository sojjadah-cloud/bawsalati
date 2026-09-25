import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { getPublicResource } from "@/features/library/service";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";
import { ResourceViewer } from "@/components/library/ResourceViewer";
import { CoverArt } from "@/components/library/CoverArt";
import { coverSrc } from "@/components/library/coverSrc";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const resource = await getPublicResource(id);
  if (!resource) return { title: "المورد غير موجود" };
  return {
    title: resource.title,
    description: resource.description.slice(0, 160) || undefined,
  };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await getPublicResource(id);
  if (!resource) notFound();

  const meta = [
    resource.author ? { label: "المؤلف", value: resource.author } : null,
    resource.publisher ? { label: "الناشر", value: resource.publisher } : null,
    resource.publishedYear ? { label: "سنة النشر", value: String(resource.publishedYear) } : null,
    { label: "النوع", value: RESOURCE_TYPE_LABELS[resource.type] },
    { label: "اللغة", value: resource.language === "ar" ? "العربية" : resource.language },
  ].filter(Boolean) as { label: string; value: string }[];

  const canDownload = resource.downloadable && (resource.hasFile || resource.hasAudio);
  const cover = coverSrc(resource);

  return (
    <div className="container-x py-10 sm:py-14">
      <Link
        href={`/library/${resource.category.slug}`}
        className="no-print mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-50"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        رجوع إلى {resource.category.name}
      </Link>

      <nav aria-label="مسار التنقّل" className="mb-4">
        <ol className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-[var(--color-muted)]">
          <li>
            <Link href="/library" className="transition-colors hover:text-brand-700">
              المكتبة الرقمية
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronLeft className="h-4 w-4" />
          </li>
          <li>
            <Link
              href={`/library/${resource.category.slug}`}
              className="transition-colors hover:text-brand-700"
            >
              {resource.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {resource.title}
          </h1>
          {resource.author ? (
            <p className="mt-2 text-center text-sm text-[var(--color-muted)]">{resource.author}</p>
          ) : null}

          {resource.description ? (
            <div className="prose-ar mt-5 text-base">
              {resource.description.split("\n").filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-8">
            <ResourceViewer
              resourceId={resource.id}
              title={resource.title}
              type={resource.type}
              hasFile={resource.hasFile}
              downloadable={resource.downloadable}
            />
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="aspect-[5/7] w-full">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <CoverArt
                  title={resource.title}
                  author={resource.author}
                  className="h-full w-full"
                />
              )}
            </div>
          </div>

          <div className="card card-pad mt-4">
            <h2 className="text-sm font-bold text-slate-900">معلومات المورد</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {meta.map((m) => (
                <div key={m.label} className="grid grid-cols-[6rem_1fr] gap-3">
                  <dt className="text-[var(--color-muted)]">{m.label}</dt>
                  <dd className="font-semibold text-slate-800">{m.value}</dd>
                </div>
              ))}
            </dl>

            {!canDownload ? (
              <p className="mt-5 rounded-[var(--radius-md)] bg-slate-50 p-3 text-xs text-[var(--color-muted)]">
                هذا المورد متاح للتصفّح داخل المنصة فقط.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
