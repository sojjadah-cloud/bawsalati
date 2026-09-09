# 04 — عقد الواجهات البرمجية

القراءة تجري في مكوّنات الخادم مباشرة عبر خدمات `src/features/*`، فلا رحلة شبكة زائدة.
مسارات `/api` مخصّصة للكتابة، ولما يحتاجه المتصفّح تفاعلياً، ولتقديم الملفات.

## عام (بلا حساب)

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/assessment/sessions` | POST | بدء جلسة اختبار، ويضبط كوكي المحاولة |
| `/api/assessment/sessions/current` | GET | حالة الجلسة + الأسئلة + الإجابات المحفوظة |
| `/api/assessment/sessions/current/answers` | POST | حفظ تدريجي للإجابات |
| `/api/assessment/sessions/current/submit` | POST | الإرسال النهائي، ويعيد رمز النتيجة |
| `/api/specialists/[id]/availability` | GET | الفترات المتاحة فعلاً |
| `/api/appointments` | POST | إنشاء حجز |
| `/api/files/library/[id]` | GET | تقديم ملف مورد (`kind=file\|audio`، `mode=view\|download`) |
| `/api/files/guide` | GET | تقديم ملف دليل الطالب |

## المختص

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/specialist/appointments/[id]` | PATCH | تغيير الحالة أو حفظ الملاحظات |
| `/api/specialist/availability` | GET · POST | فترات الدوام والأيام المحجوبة · إضافة فترة |
| `/api/specialist/availability/[id]` | DELETE | حذف فترة |
| `/api/specialist/blocked-dates` | POST | إضافة يوم غير متاح |
| `/api/specialist/blocked-dates/[id]` | DELETE | حذف يوم غير متاح |
| `/api/specialist/library/resources` | POST | إضافة مورد |
| `/api/specialist/library/resources/[id]` | PATCH · DELETE | تعديل/نشر/أرشفة · حذف نهائي (مدير فقط) |
| `/api/specialist/uploads` | POST | رفع ملف |
| `/api/specialist/profile` | GET · PATCH | الملف الشخصي ورقم الإشعار |

## المدير

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/admin/specialists` | POST | إنشاء حساب |
| `/api/admin/specialists/[id]` | PATCH | تفعيل/تعطيل، إعادة ضبط كلمة المرور |
| `/api/admin/questions/[id]` | PATCH | تعديل نص عبارة أو تعطيلها |
| `/api/admin/topics` | POST | إضافة موضوع استشارة |
| `/api/admin/topics/[id]` | PATCH · DELETE | تعديل · حذف (يُرفض إن ارتبط بحجوزات) |
| `/api/admin/guide` | POST | نشر إصدار جديد من الدليل |
| `/api/admin/settings` | PATCH | تحديث إعدادات المنصة |

## الاتفاقيات

**الأخطاء** — شكل واحد لكل الاستجابات:

```json
{ "error": "رسالة عربية للمستخدم", "issues": { "phone": ["رقم غير صحيح"] } }
```

`issues` تظهر مع 422 فقط، ومفاتيحها أسماء الحقول فتُعرَض بجانبها في النموذج.

**الرموز**

| الرمز | المعنى |
|---|---|
| 200 / 201 | نجاح · إنشاء |
| 400 | صيغة الطلب غير صحيحة |
| 401 | يلزم تسجيل الدخول |
| 403 | لا صلاحية، أو مصدر غير موثوق |
| 404 | غير موجود، أو رمز وصول غير صالح |
| 409 | تعارض: فترة محجوزة، قيمة مكرّرة، سجل مرتبط |
| 413 / 415 | حجم الملف · نوعه |
| 422 | فشل التحقق |
| 429 | تجاوز حدّ المعدّل |
| 503 | المقياس أو قواعد التصحيح غير مهيّأة |

**الترقيم** — `page` و`pageSize` في العنوان، والاستجابة تحمل `items` و`total` و`totalPages`.

**التحقق** — كل جسم طلب يمرّ بمخطط Zod قبل لمس قاعدة البيانات. لا استثناء.
