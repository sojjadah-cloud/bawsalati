import Link from "next/link";
import { BookOpen, ExternalLink, Headphones, FileText, Download } from "lucide-react";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";
import type { PublicResource } from "@/features/library/service";

const TYPE_ICON = {
  READABLE: BookOpen,
  AUDIO: Headphones,
  LINK: ExternalLink,
  OTHER: FileText,
} as const;

export function ResourceCard({ resource }: { resource: PublicResource }) {
  const Icon = TYPE_ICON[resource.type] ?? FileText;

  return (
    <li>
      <Link
        href={`/library/resource/${resource.id}`}
        className="card card-interactive flex h-full flex-col p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-brand-50 text-brand-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="badge-neutral shrink-0">{RESOURCE_TYPE_LABELS[resource.type]}</span>
        </div>

        <h3 className="mt-4 text-base leading-snug font-bold text-slate-900">{resource.title}</h3>

        {resource.author ? (
          <p className="mt-1 text-xs text-[var(--color-muted)]">{resource.author}</p>
        ) : null}

        {resource.description ? (
          <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
            {resource.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-faint)]">
          <span>{resource.category.name}</span>
          {resource.downloadable ? (
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              متاح للتنزيل
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
