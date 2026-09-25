import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Headphones,
  FileText,
  Download,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";
import { CoverArt } from "./CoverArt";
import { coverSrc } from "./coverSrc";
import type { PublicResource } from "@/features/library/service";

const TYPE_ICON = {
  READABLE: BookOpen,
  AUDIO: Headphones,
  VIDEO: Play,
  IMAGE: ImageIcon,
  LINK: ExternalLink,
  OTHER: FileText,
} as const;

export function ResourceCard({ resource }: { resource: PublicResource }) {
  const Icon = TYPE_ICON[resource.type] ?? FileText;
  const cover = coverSrc(resource);

  return (
    <li>
      <Link
        href={`/library/resource/${resource.id}`}
        className="card card-interactive flex h-full gap-4 p-4"
      >
        <span className="h-32 w-22 shrink-0 overflow-hidden rounded-[var(--radius-md)] shadow-[var(--shadow-sm)]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <CoverArt title={resource.title} author={resource.author} className="h-full w-full" />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <span className="badge-neutral shrink-0">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {RESOURCE_TYPE_LABELS[resource.type]}
            </span>
          </div>

          <h3 className="mt-2 text-base leading-snug font-bold text-slate-900">{resource.title}</h3>

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

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-line)] pt-2.5 text-xs text-[var(--color-faint)]">
            <span>{resource.category.name}</span>
            {resource.downloadable ? (
              <span className="inline-flex items-center gap-1">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                متاح للتنزيل
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
