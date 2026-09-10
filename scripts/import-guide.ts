/**
 * استيراد ملف دليل الطالب إلى التخزين الخاص ونشره كإصدار جديد.
 *
 *   npx tsx scripts/import-guide.ts "../StudentGuide2025.pdf" "دليل الطالب 2025"
 *
 * الملف يُنسخ إلى مجلد التخزين خارج public/ باسم مولّد داخلياً،
 * ويُقدَّم للطلاب عبر مسار مُصرَّح فقط.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { inspectUpload, saveFile } from "../src/lib/storage";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // العنوان يُجمع من بقية الوسائط: npm يزيل الاقتباس فيصل مقسّماً على المسافات
  const [pathArg, ...titleParts] = process.argv.slice(2);
  const titleArg = titleParts.join(" ").trim();
  if (!pathArg) {
    console.error("الاستخدام: npx tsx scripts/import-guide.ts <مسار الملف> [العنوان]");
    process.exit(1);
  }

  const fullPath = resolve(process.cwd(), pathArg);
  const buffer = await readFile(fullPath);
  const title = titleArg || "دليل الطالب";

  // يمرّ الملف بالفحص نفسه الذي يمرّ به أي رفع من الواجهة.
  const file = new File([new Uint8Array(buffer)], "guide.pdf", { type: "application/pdf" });
  const detected = await inspectUpload(file, "GUIDE", ["application/pdf"]);

  // آمن عند التكرار: النسخة نفسها لا تُنشر مرتين ولا تُكتب مرتين على القرص،
  // فيصلح استدعاء السكربت في كل عملية نشر.
  const already = await prisma.storedFile.findFirst({
    where: { checksum: detected.checksum, kind: "GUIDE" },
    select: { id: true, guideDocuments: { select: { id: true, published: true, version: true } } },
  });
  if (already?.guideDocuments.some((g) => g.published)) {
    const v = already.guideDocuments.find((g) => g.published)?.version;
    console.log(`↩︎ الإصدار ${v} منشور بالفعل بالملف نفسه — لا تغيير.`);
    return;
  }

  const storageKey = await saveFile(detected, "GUIDE");

  const stored = await prisma.storedFile.create({
    data: {
      storageKey,
      originalName: pathArg.split(/[\\/]/u).pop() ?? "guide.pdf",
      mimeType: detected.mimeType,
      size: detected.size,
      checksum: detected.checksum,
      kind: "GUIDE",
    },
    select: { id: true },
  });

  const latest = await prisma.guideDocument.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.guideDocument.updateMany({ where: { published: true }, data: { published: false } });
    await tx.guideDocument.create({
      data: {
        title,
        description:
          "الدليل الرسمي للتخصصات والبرامج الدراسية وشروط القبول ومسارات ما بعد الثانوية.",
        fileId: stored.id,
        downloadable: true,
        published: true,
        publishedAt: new Date(),
        version,
      },
    });
  });

  console.log(
    `✅ نُشر «${title}» كإصدار ${version} — ${(detected.size / (1024 * 1024)).toFixed(1)} ميغابايت`
  );
}

main()
  .catch((e) => {
    console.error("❌ فشل الاستيراد:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
