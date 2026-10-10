// ═══════════════════════════════════════════════════════════════
// استعادة ملف كتابٍ من المستودع عند الطلب.
//
// قرص الخطة المجانية يُمسح مع كل نشر، والسجلّ في القاعدة يبقى. وكتب
// content/library لها مصدرٌ في المستودع، فلا داعي لانتظار بناءٍ جديد: أوّل
// طلبٍ لملفٍ مفقود يعيده إلى مكانه بمفتاحه نفسه، ثم يُقدَّم كأن شيئاً لم يكن.
//
// يُستدعى في مسار تقديم الملفات وحده، وبعد أن يفشل القرص — لا قبله — فلا
// يُقرأ المستودع في الحالة السويّة.
// ═══════════════════════════════════════════════════════════════
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { restoreFile } from "@/lib/storage";

interface BookEntry {
  slug: string;
  title: string;
}

let catalogue: Map<string, string> | null = null;

/** عنوان الكتاب ← اسمه الثابت في المستودع. يُقرأ الملف مرة واحدة. */
async function bySlug(): Promise<Map<string, string>> {
  if (catalogue) return catalogue;
  try {
    const raw = await readFile(
      join(process.cwd(), "prisma", "seed-data", "library-books.json"),
      "utf8"
    );
    const { books } = JSON.parse(raw) as { books: BookEntry[] };
    catalogue = new Map(books.map((b) => [b.title.trim(), b.slug]));
  } catch {
    catalogue = new Map();
  }
  return catalogue;
}

/**
 * يحاول إعادة ملف المورد من المستودع إلى التخزين.
 * يعيد محتوى الملف إن نجح، و null إن لم يكن للمورد مصدرٌ في المستودع.
 */
export async function restoreFromRepo(
  title: string,
  kind: "file" | "cover",
  storageKey: string
): Promise<Buffer | null> {
  const slug = (await bySlug()).get(title.trim());
  if (!slug) return null;

  const path =
    kind === "cover"
      ? join(process.cwd(), "content", "library", "covers", `${slug}.webp`)
      : join(process.cwd(), "content", "library", `${slug}.pdf`);

  try {
    const buffer = await readFile(path);
    await restoreFile(storageKey, buffer);
    return buffer;
  } catch {
    return null;
  }
}
