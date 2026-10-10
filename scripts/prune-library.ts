/**
 * حذف موارد المكتبة التي ضاعت ملفاتها.
 *
 *   npm run library:prune            # عرض ما سيُحذف فقط
 *   npm run library:prune -- --apply # الحذف فعلاً
 *
 * يُحذف ما لا يُفتح: مورد يحمل سجلّ ملف والملف غير موجود على القرص، ومورد
 * منشور بلا ملف ولا صوت ولا رابط خارجي. كلاهما صفحةٌ ميتة يفتحها الطالب فلا
 * يجد شيئاً، ولا سبيل لاستعادة الأول — قرص الخطة المجانية يُمسح مع كل نشر وما
 * ليس في المستودع لا مصدر له.
 *
 * والمسوّدة غير المنشورة لا تُمسّ: عنوانٌ يُعدّه الأخصائي لرفع ملفه لاحقاً.
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
      published: true,
      externalUrl: true,
      category: { select: { name: true } },
      file: { select: { id: true, storageKey: true } },
      coverFile: { select: { id: true, storageKey: true } },
      audioFile: { select: { id: true, storageKey: true } },
    },
  });

  const dead: { id: string; title: string; category: string; why: string; fileIds: string[] }[] =
    [];
  let drafts = 0;

  for (const r of resources) {
    const fileIds = [r.file?.id, r.coverFile?.id, r.audioFile?.id].filter(
      (id): id is string => Boolean(id)
    );

    if (r.file) {
      if (await fileOnDisk(r.file.storageKey)) continue;
      dead.push({
        id: r.id,
        title: r.title,
        category: r.category.name,
        why: "ملفه مفقود من القرص",
        fileIds,
      });
      continue;
    }

    // بلا ملف ولا صوت ولا رابط: مسوّدة ما دامت غير منشورة، وصفحةٌ ميتة إن نُشرت
    if (!r.audioFile && !r.externalUrl) {
      if (!r.published) {
        drafts++;
        continue;
      }
      dead.push({
        id: r.id,
        title: r.title,
        category: r.category.name,
        why: "منشور بلا ما يُفتح",
        fileIds,
      });
    }
  }

  console.log(`\n🧹 موارد المكتبة: ${resources.length} (مسوّدات بلا ملف: ${drafts})`);

  if (dead.length === 0) {
    console.log("  ✔ كل مورد منشور له ما يُفتح.\n");
    return;
  }

  for (const d of dead) console.log(`  ✘ ${d.title} — ${d.category} (${d.why})`);

  if (!apply) {
    console.log(`\n  ${dead.length} مورداً لا يُفتح. للحذف: npm run library:prune -- --apply\n`);
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
