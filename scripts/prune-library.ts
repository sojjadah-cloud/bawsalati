/**
 * حذف موارد المكتبة التي ضاعت ملفاتها.
 *
 *   npm run library:prune            # عرض ما سيُحذف فقط
 *   npm run library:prune -- --apply # الحذف فعلاً
 *
 * المورد الذي يحمل سجلّ ملف والملف غير موجود على القرص صفحةٌ ميتة: يفتحها
 * الطالب فلا يتصفّح ولا يُنزّل. ولا سبيل لاستعادته — قرص الخطة المجانية يُمسح
 * مع كل نشر، وما ليس في المستودع لا مصدر له — فيُحذف هو وسجلّات ملفاته.
 *
 * يُشغَّل بعد library:import لا قبله: الاستيراد يعيد كتب content/library إلى
 * القرص أولاً، فلا يُحذف منها شيء.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileOnDisk } from "../src/lib/storage";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const apply = process.argv.includes("--apply");

  const resources = await prisma.libraryResource.findMany({
    select: {
      id: true,
      title: true,
      category: { select: { name: true } },
      file: { select: { id: true, storageKey: true } },
      coverFile: { select: { id: true, storageKey: true } },
      audioFile: { select: { id: true, storageKey: true } },
    },
  });

  const dead: { id: string; title: string; category: string; fileIds: string[] }[] = [];
  let noFile = 0;

  for (const r of resources) {
    // مورد بلا سجلّ ملف أصلاً ليس عطلاً: عنوانٌ ينتظر رفع نسخته
    if (!r.file) {
      noFile++;
      continue;
    }
    if (await fileOnDisk(r.file.storageKey)) continue;

    const fileIds = [r.file.id, r.coverFile?.id, r.audioFile?.id].filter(
      (id): id is string => Boolean(id)
    );
    dead.push({ id: r.id, title: r.title, category: r.category.name, fileIds });
  }

  console.log(`\n🧹 موارد المكتبة: ${resources.length} (بلا ملف مرفوع: ${noFile})`);

  if (dead.length === 0) {
    console.log("  ✔ لا مورد بملفٍ مفقود.\n");
    return;
  }

  for (const d of dead) console.log(`  ✘ ${d.title} — ${d.category}`);

  if (!apply) {
    console.log(`\n  ${dead.length} مورداً ملفه مفقود. للحذف: npm run library:prune -- --apply\n`);
    return;
  }

  for (const d of dead) {
    await prisma.libraryResource.delete({ where: { id: d.id } });
    // سجلّات ملفات لم يعد يشير إليها شيء، وملفاتها غير موجودة أصلاً
    for (const fileId of d.fileIds) {
      await prisma.storedFile.delete({ where: { id: fileId } }).catch(() => undefined);
    }
  }

  console.log(`\n  ✔ حُذف ${dead.length} مورداً وسجلّات ملفاته.\n`);
}

main()
  .catch((e) => {
    console.error("❌ فشل التنظيف:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
