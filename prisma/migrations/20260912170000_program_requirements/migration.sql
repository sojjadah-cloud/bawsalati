-- AlterTable
ALTER TABLE "study_programs" ADD COLUMN     "minOverall" INTEGER,
ADD COLUMN     "subjectRules" JSONB NOT NULL DEFAULT '[]';

