-- تمييز الجداول المؤقتة عن الجداول المعيارية الرسمية.
-- الجدول المؤقت يتيح تجربة المسار كاملاً قبل توفّر الجداول الرسمية،
-- وتُعرض كل نتيجة محسوبة به مصحوبة بتحذير ظاهر للطالب وللأخصائي.

-- AlterTable
ALTER TABLE "scoring_rule_sets" ADD COLUMN "provisional" BOOLEAN NOT NULL DEFAULT false;
