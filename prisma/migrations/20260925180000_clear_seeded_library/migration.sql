-- المكتبة يرفعها أخصائيو التوجيه المهني بأنفسهم، فتُحذف العناوين المزروعة
-- سلفاً: هي وحدها التي لا مالك لها ولا ملف ولا صوت ولا رابط.
DELETE FROM "library_resources"
 WHERE "createdById" IS NULL
   AND "fileId" IS NULL
   AND "audioFileId" IS NULL
   AND ("externalUrl" IS NULL OR "externalUrl" = '');

-- تصنيف «كتب علمية» أُلغي، ويُعطَّل ولا يُحذف كي لا تضيع موارد مرتبطة به.
UPDATE "library_categories" SET "active" = false WHERE "slug" = 'science';
