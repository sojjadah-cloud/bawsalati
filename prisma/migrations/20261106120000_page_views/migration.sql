-- إحصاء الزيارات.
-- لا عنوان IP محفوظ ولا كوكي ولا معرّف يدوم: البصمة تجزئةٌ يومية
-- بملحٍ يتغيّر كل يوم، فلا تُربط زيارات اليوم بزيارات غده.

CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "page_views_day_path_key" ON "page_views"("day", "path");
CREATE INDEX "page_views_day_idx" ON "page_views"("day");

CREATE TABLE "visitor_days" (
    "fingerprint" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_days_pkey" PRIMARY KEY ("fingerprint", "day")
);

CREATE INDEX "visitor_days_day_idx" ON "visitor_days"("day");
