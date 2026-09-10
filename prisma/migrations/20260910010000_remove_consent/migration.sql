-- إزالة خطوة الموافقة على إشعار الخصوصية من مسارَي الاختبار والحجز.
-- لم يعد يُطلب من الطالب تأكيد موافقته، فلا معنى لتخزين وقت موافقة لم تُعطَ.
-- صفحة إشعار الخصوصية نفسها باقية وتشرح ما يُجمع ولماذا.

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "consentAt";

-- AlterTable
ALTER TABLE "assessment_sessions" DROP COLUMN "consentAt";
