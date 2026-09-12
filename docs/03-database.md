# 03 — قاعدة البيانات

PostgreSQL عبر Prisma. كل تغيير يمرّ بترحيل مُصدَّر في `prisma/migrations`،
ولا يُعدَّل مخطط الإنتاج يدوياً.

## المجالات

| المجال | النماذج |
|---|---|
| الحسابات | `users` · `specialists` |
| المقياس | `assessment_definitions` · `assessment_groups` · `assessment_dimensions` · `assessment_questions` · `assessment_options` |
| التصحيح | `scoring_rule_sets` · `scoring_rules` |
| الجلسات والنتائج | `assessment_sessions` · `assessment_answers` · `assessment_results` · `assessment_result_sections` · `assessment_analysis` |
| المكتبة | `library_categories` · `library_resources` · `stored_files` |
| الدليل | `student_guide` |
| الحجوزات | `consultation_topics` · `specialist_availability` · `specialist_blocked_dates` · `appointments` · `appointment_status_history` |
| الإشعارات | `notification_deliveries` · `in_app_notifications` |
| الحوكمة | `audit_logs` · `settings` |
| المرجع | `programs` |

## القيود التي تحمي السلامة في القاعدة نفسها

| القيد | الغرض |
|---|---|
| `appointments (specialistId, scheduledDate, startTime)` فريد | منع الحجز المزدوج حتى عند التزاحم — الفاصل الحاسم، لا شيفرة التطبيق |
| `assessment_questions (assessmentId, number)` فريد | ترقيم العبارات 1..54 بلا تكرار |
| `assessment_questions (groupId, displayOrder)` فريد | ترتيب ثابت داخل المجموعة |
| `assessment_answers (sessionId, questionId)` فريد | إجابة واحدة لكل عبارة، والتعديل تحديث لا تكرار |
| `scoring_rules (ruleSetId, dimensionId, gradeBand, rawScore)` فريد | خلية تحويل واحدة لكل حالة |
| `assessment_sessions.tokenHash` · `appointments.tokenHash` فريدان | رمز وصول واحد لكل سجل |
| `topicId` و`ruleSetId` بـ `RESTRICT` | لا يُحذف موضوع أو إصدار قواعد يعتمد عليه سجل قائم |
| `specialistId` في الحجز بـ `RESTRICT` | لا يختفي حجز بحذف مختص |

## قرارات مقصودة

- **JSONB في موضعين فقط**: خلايا جداول النتيجة وصفوف التحليل. كلاهما لقطة مجمّدة وقت التسليم
  ولا يُستعلم داخلها. الإجابات الخام تبقى علائقية.
- **الأرشفة بدل الحذف**: مورد المكتبة يُؤرشف (`archivedAt`)؛ الحذف النهائي مقصور على المدير.
  المواضيع تُعطَّل (`active`) ولا تُحذف إن ارتبطت بحجوزات.
- **التواريخ**: `@db.Date` للتاريخ وحده، و`"HH:mm"` نصاً للوقت. التحويل يمرّ بمنتصف ليل UTC
  فلا ينزلق اليوم بين المنطقة الزمنية والقاعدة (مغطّى باختبار).
- **الملفات**: `stored_files` تحمل مفتاح تخزين داخلياً فقط. لا يصل أي مسار إلى المتصفح.
- **النشرات**: نوعا مورد إضافيان (`VIDEO` و`IMAGE`) في تصنيف «نشرات التوجيه المهني».
  يرفعها المختص من لوحته صورةً أو مقطعاً حتى 60 ميغابايت، أو يكتفي برابط خارجي،
  ويُفحص التوقيع الثنائي للملف كما في أي رفع آخر.

