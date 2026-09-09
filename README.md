# بوصلتي — منصة التوجيه المهني

منصة مستقلة تساعد الطالب على اكتشاف ميوله المهنية، والوصول إلى مكتبة رقمية ودليل الطالب،
وحجز استشارة مع مختص التوجيه المهني.

المنصة قائمة بذاتها: لا تحتوي شيفرتها ولا واجهتها على أي منصة أخرى.

## الخدمات الأربع

| الخدمة | المسار | الحساب مطلوب؟ |
|---|---|---|
| اختبار بوصلتي | `/assessment` | لا |
| المكتبة الرقمية | `/library` | لا |
| حجز موعد | `/booking` | لا |
| دليل الطالب | `/guide` | لا |

مستويان لهما حساب فقط: **مختص التوجيه المهني** (`/specialist`) و**مدير النظام** (`/admin`).

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
npm run migrate:legacy                                  # ترحيل البرامج والموارد من قاعدة بوّابة قديمة
npm run guide:import -- ../StudentGuide2025.pdf "دليل الطالب 2025"   # نشر دليل الطالب
```

حسابات التطوير التي ينشئها `npm run seed`:

| الدور | البريد | كلمة المرور |
|---|---|---|
| مدير النظام | `admin@bawsalati.om` | `Bawsalati@2026` |
| مختص التوجيه المهني | `naeem@bawsalati.om` | `Bawsalati@2026` |

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

## بنية المشروع

```
prisma/
  schema.prisma          مخطط قاعدة البيانات
  migrations/            ترحيلات مُصدَّرة
  seed-data/             بيانات المقياس وقواعد التصحيح (مصدرها موثّق)
src/
  app/
    (public)/            الموقع العام: الرئيسية، الاختبار، المكتبة، الحجز، الدليل
    specialist/          لوحة المختص
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
| `LEGACY_DATABASE_URL` | القاعدة القديمة — تُقرأ أثناء الترحيل فقط |
| `JWT_SECRET` | مفتاح توقيع الجلسات، 32 محرفاً فأكثر |
| `STORAGE_DIR` | مجلد الملفات الخاصة خارج `public/` |
| `NOTIFY_PROVIDER` | `console` للتطوير، أو `whatsapp` / `sms` |
| `NOTIFY_API_URL` · `NOTIFY_API_TOKEN` · `NOTIFY_SENDER_ID` | إعدادات مزوّد الإشعارات |
| `APP_URL` | العنوان العام (روابط، خريطة الموقع) |

## التوثيق

| الملف | المحتوى |
|---|---|
| [`docs/00-architecture-audit.md`](docs/00-architecture-audit.md) | تدقيق ما قبل إعادة الهيكلة وخطة الترحيل |
| [`docs/01-design-system.md`](docs/01-design-system.md) | الرموز التصميمية والمكوّنات وقواعد RTL |
| [`docs/02-assessment.md`](docs/02-assessment.md) | محرّك المقياس والتصحيح والنتائج |
| [`docs/03-database.md`](docs/03-database.md) | نماذج البيانات والقيود |
| [`docs/04-api.md`](docs/04-api.md) | عقد الواجهات البرمجية |
| [`docs/05-security-privacy.md`](docs/05-security-privacy.md) | الأمن والخصوصية والصلاحيات |
| [`docs/06-testing.md`](docs/06-testing.md) | التغطية وما يجب فحصه يدوياً |
