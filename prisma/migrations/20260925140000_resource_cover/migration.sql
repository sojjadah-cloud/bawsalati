-- غلاف مولَّد من الملف نفسه، وتنزيل متاح افتراضياً.
ALTER TABLE "library_resources" ADD COLUMN     "coverFileId" TEXT,
ALTER COLUMN "downloadable" SET DEFAULT true;

ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_coverFileId_fkey" FOREIGN KEY ("coverFileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- الموارد المنشورة سلفاً كانت ممنوعة التنزيل، والمطلوب إتاحته للطلبة.
UPDATE "library_resources" SET "downloadable" = true WHERE "downloadable" = false;
