import { BRAND } from "@/lib/constants";
import { appUrl } from "@/lib/app-url";

/**
 * البيانات المنظّمة (JSON-LD).
 *
 * تقرؤها محرّكات البحث فتعرف أنّ هذه منصّة تابعة لمدرسة في عُمان، لا
 * صفحةَ نصٍّ مجهولة. وهي شرط ظهور النتائج الغنيّة: اسم المنصة وشعارها
 * ومربّع البحث داخل نتيجة البحث نفسها.
 *
 * تُحقن بوسم script، وسياسة CSP تمنع السكربتات بلا nonce — لكنّ
 * type="application/ld+json" بيانات لا تُنفَّذ، فلا يمسّها المنع.
 */

function Json({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // بيانات نولّدها نحن، لا مدخلات مستخدم
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</gu, "\\u003c") }}
    />
  );
}

/** هوية المنصة والمدرسة — تُوضع في الصفحة الرئيسة وحدها. */
export function SiteStructuredData() {
  const base = appUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${base}/#organization`,
    name: BRAND.name,
    alternateName: "Bawsalati",
    description: BRAND.description,
    url: base,
    logo: `${base}/school-mark.webp`,
    image: `${base}/opengraph-image.png`,
    email: BRAND.email,
    telephone: BRAND.phone,
    inLanguage: "ar",
    parentOrganization: {
      "@type": "EducationalOrganization",
      name: "مدرسة صحار للبنين",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "OM",
      addressLocality: "صحار",
      addressRegion: "شمال الباطنة",
    },
    areaServed: { "@type": "Country", name: "سلطنة عُمان" },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: BRAND.name,
    url: base,
    description: BRAND.description,
    inLanguage: "ar",
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/programs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Json data={organization} />
      <Json data={website} />
    </>
  );
}

/** مسار التنقّل — يظهر سطراً تحت عنوان النتيجة في جوجل. */
export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  const base = appUrl();
  return (
    <Json
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          item: `${base}${t.path}`,
        })),
      }}
    />
  );
}

/** كتابٌ في المكتبة. */
export function BookStructuredData({
  title,
  description,
  author,
  year,
  path,
}: {
  title: string;
  description?: string;
  author?: string;
  year?: number | null;
  path: string;
}) {
  const base = appUrl();
  return (
    <Json
      data={{
        "@context": "https://schema.org",
        "@type": "Book",
        name: title,
        url: `${base}${path}`,
        inLanguage: "ar",
        ...(description ? { description } : {}),
        ...(author ? { author: { "@type": "Person", name: author } } : {}),
        ...(year ? { datePublished: String(year) } : {}),
        publisher: { "@id": `${base}/#organization` },
      }}
    />
  );
}

/** برنامج دراسي في دليل التخصصات. */
export function ProgramStructuredData({
  name,
  description,
  institution,
  path,
}: {
  name: string;
  description: string;
  institution?: string;
  path: string;
}) {
  const base = appUrl();
  return (
    <Json
      data={{
        "@context": "https://schema.org",
        "@type": "Course",
        name,
        description,
        url: `${base}${path}`,
        inLanguage: "ar",
        provider: institution
          ? { "@type": "EducationalOrganization", name: institution }
          : { "@id": `${base}/#organization` },
      }}
    />
  );
}
