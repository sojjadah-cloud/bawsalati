/**
 * حذف بصمات الزوّار التي انقضى يومها.
 *
 *   npm run visits:prune
 *
 * الأعداد محفوظة في page_views، والبصمة لا تلزم بعد يومها — فلا تُستبقى
 * بلا حاجة. يُشغَّل مع كل نشر ضمن npm run deploy:data.
 */
import { prisma } from "../src/lib/prisma";
import { pruneFingerprints } from "../src/features/analytics/visits";

async function main() {
  const removed = await pruneFingerprints();
  const kept = await prisma.visitorDay.count();
  console.log(`\n🧹 بصمات الزوّار: حُذف ${removed}، بقي ${kept}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
