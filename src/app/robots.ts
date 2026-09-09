import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

const base = appUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // المناطق المحمية وبيانات الطلاب لا تُفهرس إطلاقاً
      disallow: [
        "/admin",
        "/specialist",
        "/login",
        "/api/",
        "/assessment/questions",
        "/assessment/results/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
