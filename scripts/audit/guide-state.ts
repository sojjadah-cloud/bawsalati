import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const g = await prisma.guideDocument.findMany({
    select: { id: true, title: true, version: true, published: true, downloadable: true, updatedAt: true, file: { select: { id: true, originalName: true, storageKey: true, size: true, mimeType: true, kind: true } } },
  });
  console.log(JSON.stringify(g, null, 2));
  const files = await prisma.storedFile.count();
  console.log("ملفات مخزّنة:", files);
  const withFile = await prisma.libraryResource.count({ where: { OR: [{ fileId: { not: null } }, { audioFileId: { not: null } }] } });
  console.log("موارد مكتبة بملفات:", withFile);
}
main().finally(() => prisma.$disconnect());
