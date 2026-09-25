# 01 — نظام التصميم

المرجع الوحيد: `src/app/globals.css`. الصفحات تركّب من هذه الأصناف ولا تخترع أنماطاً جديدة.

## المبدأ

هادئ، أكاديمي، واضح. لا تدرّجات ثقيلة، لا زجاجية، لا حركة زخرفية.
الحركة وظيفية فقط: انتقال 150–300 مللي ثانية، وتُلغى كلياً مع `prefers-reduced-motion`.

## الرموز

| الرمز | القيمة | الاستخدام |
|---|---|---|
| `--color-brand-*` | أخضر مزرقّ 50…950 | الهوية والأفعال الأساسية |
| `--color-accent-*` | كهرماني | تمييز نادر فقط |
| `--color-ink` / `--color-body` / `--color-muted` / `--color-faint` | تدرّج حبري | النصوص حسب الأهمية |
| `--color-line` / `--color-line-strong` | حدود | الفواصل وحدود الحقول |
| `--color-canvas` / `--color-surface` | خلفيات | خلفية الصفحة والبطاقات |
| `--color-success/warning/danger/info-*` | حالات دلالية | التنبيهات والشارات |
| `--radius-sm…xl` | 6 / 10 / 14 / 18 بكسل | أنصاف الأقطار |
| `--shadow-xs…lg` | ظلال خفيفة | العمق |

الخط: `IBM Plex Sans Arabic` وحده — لاسم المنصة والعناوين والنصوص معاً، فلا اختلاف
في الشكل بين عنصر وآخر. مستضاف ذاتياً عبر `next/font`، فلا طلب خارجي ولا انزلاق تخطيط.
أوزانه 400 إلى 700؛ ما يتجاوز ذلك يُقرَّب إلى 700.

## المكوّنات

`container-x` · `container-narrow` · `btn` (`-primary` `-secondary` `-outline` `-ghost` `-danger` `-sm` `-lg` `-block`) ·
`card` (`-pad` `-interactive`) · `input` / `select` / `textarea` / `label` / `field-hint` / `field-error` ·
`badge` (`-neutral` `-brand` `-success` `-warning` `-danger` `-info`) · `table-wrap` / `table` ·
`section-kicker` / `section-title` / `section-lead` · `skeleton` · `skip-link`

مكوّنات React في `src/components/ui`:
`primitives.tsx` (Spinner · Skeleton · EmptyState · ErrorState · Alert · Badge · ProgressBar · StatCard · PageHeading) ·
`form.tsx` (TextField · SelectField · TextAreaField · CheckboxField · SubmitButton) ·
`Dialog.tsx` (Dialog · ConfirmDialog) · `Toast.tsx`.

## RTL

الجذر `<html lang="ar" dir="rtl">`. التخطيط منطقي الاتجاه من الأساس، لا محاكاة بحيل CSS:
`inset-inline-start` بدل `left`، و`me-*` / `ms-*` بدل الهوامش الجانبية الثابتة.
أسهم التقدّم تشير يساراً (`ArrowLeft`) لأنها اتجاه التقدّم في العربية.
الأرقام لاتينية للبيانات (تواريخ، هواتف، درجات) لسهولة القراءة والمقارنة.
البنية جاهزة لإضافة الإنجليزية لاحقاً: النصوص كلها في `constants.ts` أو قاعدة البيانات.

## إتاحة الوصول

- هدف اللمس 44 بكسل فأكثر لكل زر وحقل.
- حلقة تركيز ظاهرة في كل مكان، ولا تُزال أبداً.
- كل حقل له تسمية ظاهرة مرتبطة بـ `htmlFor`، والخطأ مرتبط بـ `aria-describedby` و`aria-invalid`.
- الحالة لا تُنقل باللون وحده: الشارات تحمل نصاً، وخلايا النتيجة تحمل رمزاً ونصاً للقارئ الشاشي.
- الحوارات تحبس التركيز، وتُغلق بـ Esc، وتعيد التركيز لمصدرها.
- التنبيهات في منطقة `aria-live`.
- `maximum-scale: 5` — التكبير غير معطّل.

## الاستجابة

مبني على الجوال أولاً. نقاط التوقّف `sm 640 / md 768 / lg 1024`.

| العنصر | على الجوال |
|---|---|
| أسئلة الاختبار | سؤال واحد، وأزرار التنقّل ملتصقة بأسفل الشاشة |
| جداول النتيجة 3×3 | عمود واحد لكل جدول، والشبكة تبقى 3×3 |
| جداول اللوحات | تمرير أفقي داخل `table-wrap`، والصفحة لا تتمدّد |
| لوحة الأخصائي | شريط سفلي بأربعة عناصر + لوحة «المزيد»، لا شريط جانبي مصغّر |
| اختيار يوم الحجز | شريط أيام أفقي قابل للتمرير |
