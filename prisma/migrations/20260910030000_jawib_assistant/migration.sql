
-- CreateTable
CREATE TABLE "faq_entries" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topic" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unanswered_questions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "askCount" INTEGER NOT NULL DEFAULT 1,
    "normalized" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unanswered_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faq_entries_active_idx" ON "faq_entries"("active");

-- CreateIndex
CREATE INDEX "faq_entries_topic_idx" ON "faq_entries"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "unanswered_questions_normalized_key" ON "unanswered_questions"("normalized");

-- CreateIndex
CREATE INDEX "unanswered_questions_resolved_askCount_idx" ON "unanswered_questions"("resolved", "askCount");

