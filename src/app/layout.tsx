import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { BRAND } from "@/lib/constants";
import { appUrl } from "@/lib/app-url";

// خط واحد مستضاف ذاتياً: لا طلب خارجي، ولا انزلاق تخطيط، ووزن واحد للعناوين والنصوص.
const bodyFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});



export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "بوصلتي",
    "التوجيه المهني",
    "الميول المهنية",
    "اختيار التخصص",
    "المكتبة الرقمية",
    "دليل الطالب",
    "سلطنة عُمان",
  ],
  applicationName: BRAND.name,
  openGraph: {
    type: "website",
    locale: "ar_OM",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  // لا يُمنع التكبير — شرط أساسي لإتاحة الوصول
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // سياسة CSP تسمح فقط بالسكربتات التي تحمل nonce الطلب (proxy.ts). الصفحة
  // المبنية سلفاً لا nonce فيها، فيحجب المتصفح سكربتاتها وتتعطّل كل تفاعلاتها.
  // لذلك تُرسم كل صفحة عند الطلب.
  await connection();

  return (
    <html lang="ar" dir="rtl" className={bodyFont.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
