"use client";

import { useState } from "react";
import { CoverArt } from "./CoverArt";

/**
 * صورة الغلاف مع بديلٍ مرسوم.
 *
 * ملف الغلاف قد يغيب: قرص الخطة المجانية يُمسح مع كل نشر، فيبقى سجلّ المورد
 * ويضيع ملفه. الصورة المكسورة أسوأ من غلافٍ مرسوم، فإن تعذّر تحميلها رُسمت
 * لوحة المنصة مكانها.
 */
export function CoverImage({
  src,
  title,
  author,
  className = "h-full w-full object-cover",
  eager = false,
}: {
  src: string;
  title: string;
  author: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <CoverArt title={title} author={author} className="h-full w-full" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
