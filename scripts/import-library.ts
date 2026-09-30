/**
 * إدخال كتب المكتبة الرقمية إلى قاعدة البيانات والتخزين.
 *
 *   npm run library:import
 *
 * الكتب في content/library وأغلفتها في content/library/covers، ووصفها في
 * prisma/seed-data/library-books.json. يمرّ كل ملف بفحص الرفع نفسه الذي يمرّ
 * به رفع الأخصائي، ويُخزَّن خارج public/ ويُقدَّم عبر مسار مُصرَّح.
 *
 * آمن عند التكرار، ولازمٌ في كل نشر: قرص Render المجاني يُمسح مع كل نشر
 * والقاعدة باقية، فيبقى السجلّ ويضيع الملف — فيُعيده هذا السكربت بمفتاحه نفسه.
 * ولا يمسّ ما يرفعه الأخصائيون: يطابق بعنوان الكتاب فيحدّثه أو ينشئه فقط.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient, type FileKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { inspectUpload, restoreFile, saveFile, type StorageKind } from "../src/lib/storage";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface Book {
  slug: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number | null;
  category: string;
  pages: number;
  featured: boolean;
  description: string;
}

const CONTENT = join(process.cwd(), "content", "library");

/**
 * يسجّل ملفاً في التخزين، أو يعيد المسجَّل إن كان المحتوى نفسه مسجّلاً من قبل.
 * البصمة هي المرجع: الملف نفسه لا يُكتب مرتين، وإن مُسح من القرص أُعيد.
 */
async function storeFile(
  buffer: Buffer,
  originalName: string,
  kind: StorageKind & FileKind,
  accept: string[]
): Promise<{ id: string; restored: boolean }> {
  const file = new File([new Uint8Array(buffer)], originalName, { type: accept[0] });
  const detected = await inspectUpload(file, kind, accept);

  const existing = await prisma.storedFile.findFirst({
    where: { checksum: detected.checksum, kind },
    select: { id: true, storageKey: true },
  });
  if (existing) {
    const restored = await restoreFile(existing.storageKey, detected.buffer);
    return { id: existing.id, restored };
  }

  const storageKey = await saveFile(detected, kind);
  const stored = await prisma.storedFile.create({
    data: {
      storageKey,
      originalName,
      mimeType: detected.mimeType,
      size: detected.size,
      checksum: detected.checksum,
      kind,
    },
    select: { id: true },
  });
  return { id: stored.id, restored: false };
}

/** الغلاف اختياري: كتابٌ تعذّر توليد غلافه تبقى له لوحة المنصة المرسومة. */
async function readOptional(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

async function main() {
  const { books } = JSON.parse(
    await readFile(join(process.cwd(), "prisma", "seed-data", "library-books.json"), "utf8")
  ) as { books: Book[] };

  console.log(`\n📚 إدخال ${books.length} كتاباً إلى المكتبة الرقمية\n`);

  const categories = await prisma.libraryCategory.findMany({ select: { id: true, slug: true } });
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  let added = 0;
  let updated = 0;
  let restored = 0;
  let skipped = 0;

  for (const book of books) {
    const target = categoryId.get(book.category);
    if (!target) {
      console.log(`  ✗ ${book.title}: تصنيف «${book.category}» غير موجود — شغّل npm run seed أولاً`);
      continue;
    }

    // ملفٌ غائب لا يُسقط البناء: يُتخطّى الكتاب ويبقى ما سواه
    const pdf = await readOptional(join(CONTENT, `${book.slug}.pdf`));
    if (!pdf) {
      console.log(`  ⚠ ${book.title}: لا ملف في content/library/${book.slug}.pdf — تُخطّي`);
      skipped++;
      continue;
    }
    const file = await storeFile(pdf, `${book.slug}.pdf`, "LIBRARY", ["application/pdf"]);
    if (file.restored) restored++;

    const coverBuffer = await readOptional(join(CONTENT, "covers", `${book.slug}.webp`));
    const cover = coverBuffer
      ? await storeFile(coverBuffer, `${book.slug}.webp`, "COVER", ["image/webp"])
      : null;
    if (cover?.restored) restored++;

    const description = book.pages
      ? `${book.description} (${book.pages} صفحة)`
      : book.description;

    const data = {
      categoryId: target,
      description,
      type: "READABLE" as const,
      author: book.author,
      publisher: book.publisher || null,
      publishedYear: book.publishedYear,
      language: "ar",
      fileId: file.id,
      coverFileId: cover?.id ?? null,
      downloadable: true,
      featured: book.featured,
      published: true,
      archivedAt: null,
    };

    // المطابقة بالعنوان: الكتاب الواحد لا يُكرَّر مهما أُعيد تشغيل السكربت
    const existing = await prisma.libraryResource.findFirst({
      where: { title: book.title },
      select: { id: true },
    });

    if (existing) {
      await prisma.libraryResource.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.libraryResource.create({ data: { ...data, title: book.title } });
      added++;
    }

    console.log(`  ✔ ${book.title} — ${(pdf.length / 1048576).toFixed(1)}MB${cover ? " + غلاف" : ""}`);
  }

  const total = await prisma.libraryResource.count({ where: { published: true, archivedAt: null } });
  console.log(
    `\n  جديد: ${added}، محدَّث: ${updated}، ملفات أُعيدت للقرص: ${restored}` +
      (skipped > 0 ? `، متخطّى بلا ملف: ${skipped}` : "")
  );
  console.log(`  الإجمالي المنشور في المكتبة: ${total}\n`);
}

main()
  .catch((e) => {
    console.error("❌ فشل الإدخال:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
