import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/constants";

/**
 * بيان التطبيق — يجعل المنصة قابلة للتثبيت على هاتف الطالب،
 * وهو من إشارات «ملاءمة الجوال» التي تقرؤها محرّكات البحث.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    lang: "ar",
    dir: "rtl",
    categories: ["education"],
    icons: [
      { src: "/school-mark.webp", sizes: "512x512", type: "image/webp", purpose: "any" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };
}
