# بوصلتي — منصة التوجيه المهني

منصة مستقلة تساعد الطالب على اكتشاف ميوله المهنية، والوصول إلى مكتبة رقمية ودليل الطالب،
وحجز استشارة مع أخصائي التوجيه المهني.

المنصة قائمة بذاتها: لا تحتوي شيفرتها ولا واجهتها على أي منصة أخرى.

## الخدمات الأربع

| الخدمة | المسار | الحساب مطلوب؟ |
|---|---|---|
| مقياس السمات والميول المهنية | `/assessment` | لا |
| المكتبة الرقمية | `/library` | لا |
| حجز موعد | `/booking` | لا |
| دليل الطالب | `/guide` | لا |

مستويان لهما حساب فقط: **أخصائي التوجيه المهني** (`/specialist`) و**مدير النظام** (`/admin`).

## التقنيات

Next.js 16 (App Router) · React 19 · TypeScript صارم · Tailwind CSS 4 · Prisma 7 · PostgreSQL · Zod · Vitest

## التشغيل محلياً

```bash
npm install
npm run db          # PostgreSQL مدمجة على المنفذ 5433 — اتركها تعمل في طرفية مستقلة
npm run db:setup    # إنشاء الجداول + البيانات الأساسية
npm run dev         # http://localhost:3000
```

خطوات اختيارية:

```bash
npm run norms:build              # اشتقاق الجداول المعيارية من نتائج الطلبة
npm run library:files -- <مجلد>  # إرفاق نسخ الكتب بعناوين المكتبة
```

حسابات التطوير التي ينشئها `npm run seed`:

| الدور | البريد | كلمة المرور |
|---|---|---|
| مدير النظام | `admin@bawsalati.om` | `Bawsalati@2026` |
| أخصائي التوجيه المهني | `naeem@bawsalati.om` | `Bawsalati@2026` |

> غيّر كلمات المرور و `JWT_SECRET` قبل أي نشر حقيقي. اضبط `SEED_PASSWORD` لتغيير كلمة مرور التهيئة.

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | خادم التطوير |
| `npm run build` / `npm start` | بناء وتشغيل الإنتاج |
| `npm run verify` | فحص الأنواع + التدقيق + الاختبارات |
| `npm test` | اختبارات Vitest (وحدة + تكامل) |
| `npm run migrate` | إنشاء وتطبيق ترحيل جديد |
| `npm run migrate:deploy` | تطبيق الترحيلات في الإنتاج |
| `npm run seed` | بيانات المقياس والتصنيفات والمواضيع |
| `npm run norms:provisional` | جدول تحويل مؤقّت للتجربة (يظهر تحذير على كل نتيجة) |
| `npm run norms:import` | استيراد الجداول المعيارية الرسمية |
| `npm run norms:build` | اشتقاق الجداول المعيارية من نتائج الطلبة |
| `npm run programs:convert` | تحويل إكسل الدليل إلى بيانات البرامج |
| `npm run programs:import` | إدخال البرامج في قاعدة البيانات |
| `npm run programs:verify` | مطابقة البرامج بصفحات الدليل |
| `npm run programs:text` | فحص أسماء البرامج وشروطها |
| `npm run audit:data` | فحص البيانات والمحتوى |
| `npm run audit:pages` / `audit:api` | فحص الصفحات والواجهات على الخادم المحلي |
| `npm run audit:flow` / `audit:booking` | فحص الاختبار والحجز من البداية للنهاية |
| `npm run audit:cells` | مطابقة إجابات الاختبار بخانات النتيجة |
| `npm run audit:live` | فحص الموقع المنشور |

## النشر

`render.yaml` في الجذر ينشئ التطبيق وقاعدة البيانات على Render دفعة واحدة:
**New → Blueprint**، ثم اختر المستودع وفرع `main`، واضبط `SEED_PASSWORD` عند الطلب.
التفاصيل والقيود في [`docs/07-deployment.md`](docs/07-deployment.md).

## بنية المشروع

```
prisma/
  schema.prisma          مخطط قاعدة البيانات
  migrations/            ترحيلات مُصدَّرة
  seed-data/             بيانات المقياس وقواعد التصحيح (مصدرها موثّق)
src/
  app/
    (public)/            الموقع العام: الرئيسية، الاختبار، المكتبة، الحجز، الدليل
    specialist/          لوحة الأخصائي
    admin/               إدارة المنصة
    api/                 مسارات الكتابة وتقديم الملفات
  features/              منطق المجال: assessment · library · appointments · guide · specialist
  components/            واجهة قابلة لإعادة الاستخدام: ui · public · dashboard · admin
  lib/                   الجلسات، التخزين، الإشعارات، الوقت، التدقيق، حدود المعدّل
  proxy.ts               ترويسات الأمان + الفحص المبدئي للصلاحية
tests/                   unit + integration
docs/                    التوثيق
scripts/                 قاعدة التطوير، الترحيل، استيراد الدليل
```

## متغيّرات البيئة

| المتغيّر | الوصف |
|---|---|
| `DATABASE_URL` | اتصال PostgreSQL |
| `JWT_SECRET` | مفتاح توقيع الجلسات، 32 محرفاً فأكثر |
| `STORAGE_DIR` | مجلد الملفات الخاصة خارج `public/` |
| `NOTIFY_PROVIDER` | `console` للتطوير، أو `whatsapp` / `sms` |
| `NOTIFY_API_URL` · `NOTIFY_API_TOKEN` · `NOTIFY_SENDER_ID` | إعدادات مزوّد الإشعارات |
| `APP_URL` | العنوان العام (روابط، خريطة الموقع) |

## التوثيق

| الملف | المحتوى |
|---|---|
| [`docs/01-design-system.md`](docs/01-design-system.md) | الرموز التصميمية والمكوّنات وقواعد RTL |
| [`docs/02-assessment.md`](docs/02-assessment.md) | محرّك المقياس والتصحيح والنتائج |
| [`docs/03-database.md`](docs/03-database.md) | نماذج البيانات والقيود |
| [`docs/04-api.md`](docs/04-api.md) | عقد الواجهات البرمجية |
| [`docs/05-security-privacy.md`](docs/05-security-privacy.md) | الأمن والخصوصية والصلاحيات |
| [`docs/06-testing.md`](docs/06-testing.md) | التغطية وما يجب فحصه يدوياً |
| [`docs/07-deployment.md`](docs/07-deployment.md) | النشر على Render وقائمة ما قبل الإطلاق |
