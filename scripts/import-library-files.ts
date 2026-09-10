/**
 * إرفاق نسخ الكتب بعناوين المكتبة دفعةً واحدة.
 *
 *   npx tsx scripts/import-library-files.ts <مجلد-الملفات> [--apply]
 *
 * يوازن اسم كل ملف بعناوين المكتبة، ويعرض ما سيفعله أولاً. لا يكتب شيئاً
 * إلا مع --apply، فلا يُرفق ملف بعنوان خاطئ بلا مراجعة.
 *
 * الأنواع: PDF يُرفق كنسخة للقراءة، و MP3 كنسخة مسموعة.
 * الملف يمرّ بفحص الرفع نفسه: الحجم، والنوع، وبصمة بداية الملف.
 *
 * حقوق النشر مسؤولية من يرفع: لا ترفع إلا ما تملك حقّ إتاحته للطلاب.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { inspectUpload, saveFile } from "../src/lib/storage";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* ───────────────────────── مطابقة الأسماء ───────────────────────── */

function normalize(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ة/gu, "ه")
    .replace(/ى/gu, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length > 1);
}

/** نسبة كلمات اسم الملف الموجودة في عنوان الكتاب، وبالعكس. */
function similarity(fileName: string, title: string): number {
  const a = new Set(tokens(fileName));
  const b = new Set(tokens(title));
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return (shared / a.size) * 0.5 + (shared / b.size) * 0.5;
}

/** أدنى تشابه يُقبل. دونه يُترك الملف للمختص يرفعه بنفسه. */
const THRESHOLD = 0.6;

const READABLE = ["application/pdf"];
const AUDIO = ["audio/mpeg"];

async function main() {
  const [dirArg, ...flags] = process.argv.slice(2);
  const apply = flags.includes("--apply");
  if (!dirArg) {
    console.error("الاستخدام: npx tsx scripts/import-library-files.ts <مجلد> [--apply]");
    process.exit(1);
  }

  const dir = resolve(process.cwd(), dirArg);
  const names = (await readdir(dir)).filter((n) => /\.(pdf|mp3)$/iu.test(n));
  if (names.length === 0) {
    console.log("لا توجد ملفات PDF أو MP3 في المجلد.");
    return;
  }

  const resources = await prisma.libraryResource.findMany({
    where: { archivedAt: null },
    select: { id: true, title: true, author: true, fileId: true, audioFileId: true },
  });

  console.log(`\n📚 ${names.length} ملفاً مقابل ${resources.length} عنواناً` + (apply ? "" : "  (عرض فقط)") + "\n");

  let attached = 0;
  const unmatched: string[] = [];

  for (const name of names) {
    const stem = basename(name, extname(name));
    const ext = extname(name).toLowerCase();
    const isAudio = ext === ".mp3";

    let best: (typeof resources)[number] | null = null;
    let bestScore = 0;
    for (const r of resources) {
      const score = Math.max(similarity(stem, r.title), similarity(stem, `${r.title} ${r.author ?? ""}`));
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }

    if (!best || bestScore < THRESHOLD) {
      unmatched.push(`${name}  (أقرب تطابق ${(bestScore * 100).toFixed(0)}%: ${best?.title ?? "—"})`);
      continue;
    }

    const already = isAudio ? best.audioFileId : best.fileId;
    if (already) {
      console.log(`↩︎ ${best.title} — مرفق سلفاً، تُخطّى ${name}`);
      continue;
    }

    console.log(`${apply ? "⬆" : "•"} ${name}\n   → ${best.title}  (${(bestScore * 100).toFixed(0)}%)`);
    if (!apply) {
      attached++;
      continue;
    }

    const buffer = await readFile(join(dir, name));
    const file = new File([new Uint8Array(buffer)], name, {
      type: isAudio ? "audio/mpeg" : "application/pdf",
    });
    const detected = await inspectUpload(file, isAudio ? "AUDIO" : "LIBRARY", isAudio ? AUDIO : READABLE);
    const storageKey = await saveFile(detected, isAudio ? "AUDIO" : "LIBRARY");

    const stored = await prisma.storedFile.create({
      data: {
        storageKey,
        originalName: name,
        mimeType: detected.mimeType,
        size: detected.size,
        checksum: detected.checksum,
        kind: isAudio ? "AUDIO" : "LIBRARY",
      },
      select: { id: true },
    });

    await prisma.libraryResource.update({
      where: { id: best.id },
      data: isAudio
        ? { audioFileId: stored.id, type: "AUDIO" }
        : { fileId: stored.id, type: "READABLE" },
    });

    attached++;
  }

  console.log(`\n${apply ? "أُرفق" : "سيُرفق"}: ${attached} ملفاً`);
  if (unmatched.length) {
    console.log(`\nبلا تطابق مؤكّد (${unmatched.length}) — ارفعها من لوحة المختص أو أعد تسميتها بعنوان الكتاب:`);
    for (const u of unmatched) console.log("  - " + u);
  }
  if (!apply) console.log("\nأعد الأمر مع --apply للتنفيذ.\n");
}

main()
  .catch((e) => {
    console.error("❌ فشل الإرفاق:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
