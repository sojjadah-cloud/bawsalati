-- AlterTable
ALTER TABLE "faq_entries" ADD COLUMN     "page" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "faq_entries_source_idx" ON "faq_entries"("source");

