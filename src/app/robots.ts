import type { MetadataRoute } from "next";

const base = process.env.APP_URL || "http://localhost:3000";

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
