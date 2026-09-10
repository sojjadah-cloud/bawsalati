-- اعتماد المنهجية الرسمية لمقياس الميول المهنية.
--
-- الجداول المعيارية تختلف حسب الصف والنوع معاً، فأُضيف عمود gender إلى
-- قواعد التحويل. القواعد الموجودة سابقاً لا تحمل نوعاً ولا تطابق المثال
-- الوارد في الدليل، فتُحذف بدل ترحيلها بنوع مفترض. تُدخل الجداول الرسمية
-- من لوحة المدير أو عبر سكربت الاستيراد.

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- حذف قواعد التحويل غير المعتمدة قبل إضافة عمود إلزامي
DELETE FROM "scoring_rules";
UPDATE "scoring_rule_sets" SET "active" = false;

-- DropIndex
DROP INDEX "scoring_rules_ruleSetId_dimensionId_gradeBand_rawScore_key";

-- DropIndex
DROP INDEX "scoring_rules_ruleSetId_gradeBand_idx";

-- AlterTable
ALTER TABLE "assessment_dimensions" ADD COLUMN     "key" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "assessment_results" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "interestCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "recommendation" TEXT,
ADD COLUMN     "specialistNotes" TEXT;

-- AlterTable
ALTER TABLE "assessment_sessions" ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'MALE';

-- AlterTable
ALTER TABLE "scoring_rules" ADD COLUMN     "gender" "Gender" NOT NULL;

-- CreateIndex
CREATE INDEX "assessment_results_approvedAt_idx" ON "assessment_results"("approvedAt");

-- CreateIndex
CREATE INDEX "scoring_rules_ruleSetId_gradeBand_gender_idx" ON "scoring_rules"("ruleSetId", "gradeBand", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_rules_ruleSetId_dimensionId_gradeBand_gender_rawSco_key" ON "scoring_rules"("ruleSetId", "dimensionId", "gradeBand", "gender", "rawScore");

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
