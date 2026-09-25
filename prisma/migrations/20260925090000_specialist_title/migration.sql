-- تسمية الدور صارت «أخصائي التوجيه المهني» بدل «مختص التوجيه المهني».
ALTER TABLE "specialists" ALTER COLUMN "title" SET DEFAULT 'أخصائي التوجيه المهني';

-- والصفوف القائمة تُصحَّح، فلا يرى الطالب التسمية القديمة.
UPDATE "specialists"
   SET "title" = replace("title", 'مختص', 'أخصائي'),
       "bio"   = replace("bio",   'مختص', 'أخصائي')
 WHERE "title" LIKE '%مختص%' OR "bio" LIKE '%مختص%';
