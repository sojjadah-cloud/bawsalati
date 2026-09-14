"""تحويل دليل التخصصات والبرامج من ملف إكسل إلى بيانات المنصة.

    python scripts/xlsx-to-programs.py <ملف.xlsx> [ملف-الخرج.json]

الملف المصدر مستخرج من صفحات دليل الطالب 74–242، وفيه ورقة «تفاصيل البرامج»
بصفٍّ لكل برنامج. لا يضيف هذا السكربت معلومة من خارج الملف: يصحّح ما شوّهه
استخراج النصّ العربي فقط، ثم يعيد تشكيل الصفوف حقولاً مسمّاة.

يحتاج openpyxl، ولا يُشغَّل إلا عند تحديث الدليل. الخرج JSON يُحفظ في
المستودع ويُدخَل بـ npm run programs:import.
"""

import json
import re
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:  # pragma: no cover - أداة تشغيل يدوي
    sys.exit("ثبّت openpyxl أولاً:  pip install openpyxl")

SHEET = "تفاصيل البرامج"

# استخراج النصّ العربي من PDF يقلب رباط «لا» مع الهمزة التي بعده،
# فتخرج «الإنجليزية» بصورة «اإلنجليزية». هذه إعادة الحرفين إلى موضعهما.
LAM_ALEF_FIXES = [("اإل", "الإ"), ("األ", "الأ"), ("اال", "الا"), ("اآل", "الآ")]

# الانقلاب نفسه يصيب «لا» داخل الكلمة فتخرج «ال»: «العلاج» ← «العالج».
# لا يمكن تمييزها آلياً عن أداة التعريف، فتُصحَّح الكلمات المرصودة وحدها.
WORD_FIXES = {
    "الإسالمية": "الإسلامية", "إسالمية": "إسلامية", "الاإسالمية": "الإسلامية",
    "الواليات": "الولايات", "وواليات": "وولايات",
    "صاللة": "صلالة", "بهالء": "بهلاء", "جعالن": "جعلان",
    "خالل": "خلال", "الاستقالل": "الاستقلال", "استالم": "استلام",
    "المالحة": "الملاحة", "مالحة": "ملاحة",
    "العالقات": "العلاقات", "عالقات": "علاقات",
    "الإعالم": "الإعلام", "إعالم": "إعلام", "الإعالن": "الإعلان",
    "لألعمال": "للأعمال",
    "السالمة": "السلامة", "والسالمة": "والسلامة", "سالمة": "سلامة",
    "المقابالت": "المقابلات", "والمقابالت": "والمقابلات",
    "الاطالع": "الاطلاع",
    "العالج": "العلاج", "عالج": "علاج", "وعالج": "وعلاج", "والعالجية": "والعلاجية",
    "مالحظات": "ملاحظات", "مالحظة": "ملاحظة",
    "وسالسل": "وسلاسل", "وتحليالت": "وتحليلات", "والتحليالت": "والتحليلات",
    "والمعامالت": "والمعاملات", "مالءمته": "ملاءمته",
    "سالح": "سلاح", "الحالقة": "الحلاقة", "الآالت": "الآلات",
    "تفضيال": "تفضيلاً", "حاصال": "حاصلاً", "أوال": "أولاً",
    "والية": "ولاية", "واليتي": "ولايتي", "لالمتحان": "للامتحان", "أداليد": "أدلايد",
    "لإلناث": "للإناث", "لإلدارة": "للإدارة", "لإلختبار": "للإختبار",
    "الختبار": "لاختبار", "الئقا": "لائقاً", "غال": "غلا", "وال": "ولا",
    "الموادالآتية": "المواد الآتية", "التقل": "لا تقل",
    # «ثلاث» تخرج «ثالث»، ولا تُصحَّح إلا في موضعٍ لا يحتمل العدد الترتيبي
    "ثالث مواد": "ثلاث مواد", "ثالث منها": "ثلاث منها",
}

COLUMNS = {
    "field": "المجال الأكاديمي",
    "programType": "نوع البرنامج للفلترة",
    "track": "المسار / التمويل الأساسي",
    "eligibility": "فئة الاستحقاق",
    "code": "رمز البرنامج",
    "name": "اسم البرنامج / التخصص",
    "requirements": "الحد الأدنى للتقدم والشروط",
    "tieBreakers": "مواد المفاضلة / حسم التعادل",
    "language": "لغة الدراسة",
    "country": "الدولة / بلد الدراسة",
    "institution": "المؤسسة التعليمية",
    "qualification": "المؤهل / الدرجة (إن ورد)",
    "notes": "الملاحظات والشروط الإضافية",
    "page": "صفحة الدليل",
}

# حقول سطر واحد: يُطوى فيها فاصل السطر الذي أدخله التنسيق
SINGLE_LINE = {"field", "programType", "track", "eligibility", "code", "name",
               "language", "country", "institution", "qualification"}


def fix_arabic(text: str) -> str:
    # التشكيل زخرفي في الأصل ويخرج مبعثراً عن موضعه («ُعُ مان»)، فيُزال كلّه
    text = re.sub(r"[ً-ْٰـ]", "", text)
    # «عُمان» تخرج مقطوعة بعد إزالة التشكيل لأن مسافةً تتخلّلها في الأصل
    text = text.replace("ع مان", "عمان")
    # واو العطف تُفصل عن كلمتها في الاستخراج: «الإقتصاد و إدارة» ← «وإدارة»
    text = re.sub(r"(?<=\s)و\s+(?=[ء-ي])", "و", text)
    for wrong, right in LAM_ALEF_FIXES:
        text = text.replace(wrong, right)
    # التاء المربوطة تلتصق بالكلمة التالية أحياناً: «اللغةالعربية».
    # تأتي بعد إصلاح رباط «لا» كي تُقرأ «اللغةالإنجليزية» أيضاً
    text = re.sub(r"ة(?=(?:ال|و|في|من)[ء-ي])", "ة ", text)
    # تصحيح الكلمات المرصودة ككلمات كاملة لا كمقاطع
    text = re.sub(
        r"(?<![ء-ي])(" + "|".join(map(re.escape, WORD_FIXES)) + r")(?![ء-ي])",
        lambda m: WORD_FIXES[m.group(1)],
        text,
    )
    # أداة التعريف لا تقف وحدها كلمةً في العربية، فكل «ال» منفردة أصلها «لا»
    text = re.sub(r"(?<![^\W\d_])ال(?![^\W\d_])", "لا", text)
    # علامة النسبة تخرج قبل الرقم أو بعده بمسافة: «٪95» و«65 ٪» ← «95%» و«65%»
    text = re.sub(r"٪[ \t]*(\d+(?:\.\d+)?)", r"\1%", text)
    text = re.sub(r"(\d+(?:\.\d+)?)[ \t]*٪", r"\1%", text)
    # وتخرج أحياناً بالعلامة اللاتينية سابقةً رقمها: «(%80 )» ← «(80%)»
    text = re.sub(r"%[ \t]*(\d+(?:\.\d+)?)", r"\1%", text)
    # مسافة تسلّلت إلى داخل القوسين حين أُعيد ترتيب المقاطع
    text = re.sub(r"\([ \t]+", "(", text)
    text = re.sub(r"[ \t]+\)", ")", text)
    # وسقطت المسافة قبل القوس: «الحصول على(70%)»
    text = re.sub(r"(?<=[ء-ي])\(", " (", text)
    out = []
    for line in text.split("\n"):
        out += unscramble(line)
    return "\n".join(out)


# النسبة المئوية مقطع لاتيني داخل سطر عربي، فيخرج من الاستخراج مقلوب القوسين
# ومنتزعاً من موضعه: «بتقدير) في الرياضيات 60%(• الحصول على (65%).» وأصله
# سطران: «بتقدير (65%).» و«• الحصول على (60%) في الرياضيات».
SCRAMBLED = re.compile(r"\)([^()]*?)(\d+(?:\.\d+)?%?)\(")
PUNCT_ONLY = re.compile(r"^[.\-–—:،؛\s]*$")


def unscramble(line: str) -> list:
    """فكّ تشابك الأسطر التي انتزعت منها النسب المئوية، وإعادتها أسطراً."""
    parts = SCRAMBLED.split(line)
    if len(parts) == 1:
        return [fix_reversed_run(line)]

    # parts = [نصّ، وسط، نسبة، نصّ، وسط، نسبة، نصّ ...]
    base = parts[0].strip()
    lines = []
    for i in range(1, len(parts) - 1, 3):
        middle, pct, following = parts[i], parts[i + 1], parts[i + 2]
        head, _, rest = following.partition("(")
        head = head.strip()
        if middle and not middle.startswith((" ", ".", "،", ":")):
            middle = " " + middle
        if head:
            # النقطة في آخر الرأس هي نهاية السطر المعاد تركيبه لا نهاية الرأس
            dot = "." if head.endswith(".") and not middle.rstrip().endswith(".") else ""
            lines.append(f"{head.rstrip('.').strip()} ({pct}){middle.rstrip()}{dot}")
            if rest.strip():
                base = f"{base} ({rest}".strip()
        else:
            # لا رأس بعد النسبة، فهي تعود إلى النصّ الذي قبلها
            base = f"{base} ({pct}){middle}".strip()

    # ما تبقّى قبل أوّل نسبة علامةَ ترقيم وحدها هو نهاية السطر الأوّل مقلوبة
    if lines and base.strip() and PUNCT_ONLY.match(base):
        lines[0] = (lines[0].rstrip(".") + base.strip()[::-1]).strip()
        base = ""

    return [fix_reversed_run(x) for x in [base] + lines if x.strip()]


def fix_reversed_run(line: str) -> str:
    # «)65%(» ← «(65%)»: قوسان مقلوبان حول نسبة داخل السطر
    line = re.sub(r"\)(\d+(?:\.\d+)?%)\(", r"(\1)", line)
    # علامة نسبة عارية بقيت بلا رقمها بعد إعادة الترتيب
    line = re.sub(r"\s*٪\s*(?=[(\s])", " ", line)
    # القوس اللاتيني يلتصق بالكلمة العربية بعده فتُفصل بمسافة
    line = re.sub(r"\)(?=[؀-ۿ])", ") ", line)
    return tidy_bullet(line)


# علامات الترقيم في أسطر القوائم تنتقل إلى الطرف المقابل عند الاستخراج،
# فتخرج «- الرياضيات» بصورة «الرياضيات.-». تُعاد صياغة السطر بعلامة واحدة.
EDGE_MARKS = r"[.\-–—:،؛\s]"


def tidy_bullet(line: str) -> str:
    core = line.strip()
    if not core or core.startswith("•"):
        return line

    lead = re.match(rf"^{EDGE_MARKS}+", core)
    trail = re.search(rf"{EDGE_MARKS}+$", core)
    marks = (lead.group(0) if lead else "") + (trail.group(0) if trail else "")
    if not marks.strip():
        return line

    start = lead.end() if lead else 0
    end = trail.start() if trail else len(core)
    body = core[start:end].strip()
    if not body:
        return line

    if ":" in marks:
        return f"{body}:"
    if "-" in marks or "–" in marks or "—" in marks:
        return f"- {body}." if "." in marks else f"- {body}"
    return f"{body}." if "." in marks else body


def swap_wrapping_parens(text: str) -> str:
    """اسم بين قوسين يخرج مقلوب القوسين: «)Nursing(» ← «(Nursing)»."""
    stripped = text.strip()
    if stripped.startswith(")") and stripped.endswith("("):
        return "(" + stripped[1:-1] + ")"
    # قوسان ملتصقان في أول النصّ: «)(للذكور فقط» ← «(للذكور فقط)»
    if stripped.startswith(")(" ) and ")" not in stripped[2:]:
        return "(" + stripped[2:] + ")"
    # «) نصّ رقم(» ← «(رقم نصّ)»: الرقم قفز إلى آخر المقطع
    match = re.match(r"^(?P<head>.*?)\)\s*(?P<body>[^()]*?)(?P<num>\d+)\s*\($", stripped)
    if match and match.group("body").strip():
        head = match.group("head").strip()
        body = match.group("body").strip()
        return f"{head} ({match.group('num')} {body})".strip()

    # «إناث)-(ذكور البيع» ← «(ذكور- إناث) البيع»: القوسان ومحتواهما مقلوبان
    match = re.match(
        r"^(?P<a>[^()]{1,24}?)\)(?P<mid>[^()]{0,6})\((?P<b>[^()\s]{1,24})(?P<rest>\s.*)?$",
        stripped,
    )
    if match:
        rest = (match.group("rest") or "").rstrip()
        return f"({match.group('b')}{match.group('mid')} {match.group('a')}){rest}"

    # قوسان ملتصقان في وسط النصّ بلا محتوى: «الأعمال )(إدارة الموارد»
    stripped = re.sub(r"\)\(", " ", stripped)
    return stripped


def clean(value, single_line: bool) -> str:
    if value is None:
        return ""
    text = fix_arabic(str(value)).replace("‏", "").replace("‎", "")
    # إصلاح القوسين بعد طيّ الأسطر، فالمقطع المقلوب قد يتوزّع على سطرين
    if single_line:
        text = re.sub(r"\s+", " ", swap_wrapping_parens(re.sub(r"\s+", " ", text)))
    else:
        text = re.sub(r"[ \t]+", " ", text)
        text = "\n".join(swap_wrapping_parens(line) for line in text.split("\n"))
        text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("مرّر مسار ملف الإكسل")
    source = Path(sys.argv[1])
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("prisma/seed-data/study-programs.json")

    book = openpyxl.load_workbook(source, data_only=True)
    if SHEET not in book.sheetnames:
        sys.exit(f"لا توجد ورقة «{SHEET}» في الملف")

    rows = list(book[SHEET].iter_rows(values_only=True))
    header = [str(h or "").strip() for h in rows[0]]
    missing = [c for c in COLUMNS.values() if c not in header]
    if missing:
        sys.exit("أعمدة ناقصة: " + "، ".join(missing))

    index = {name: header.index(name) for name in COLUMNS.values()}
    programs, seen = [], set()

    # حقول صحّحناها من الدليل حيث جاء المصدر ناقصاً، كلٌّ بصفحته
    overrides_file = Path("prisma/seed-data/program-overrides.json")
    overrides = {}
    if overrides_file.exists():
        for o in json.loads(overrides_file.read_text(encoding="utf-8"))["overrides"]:
            fixed = {k: v for k, v in o.items() if k in ("name", "requirements")}
            if fixed:
                overrides[o["code"]] = fixed

    for row in rows[1:]:
        if not any(cell is not None for cell in row):
            continue
        record = {
            key: clean(row[index[column]], key in SINGLE_LINE)
            for key, column in COLUMNS.items()
        }
        # شرطة القائمة في أول الاسم ليست من الاسم
        record["name"] = re.sub(r"^[-–—]\s*", "", record["name"]).strip()
        if not record["code"] or not record["name"]:
            continue
        if record["code"] in seen:
            sys.exit(f"رمز مكرّر في الملف: {record['code']}")
        seen.add(record["code"])
        record.update(overrides.get(record["code"], {}))
        record["page"] = int(record["page"]) if record["page"].isdigit() else None
        programs.append(record)

    payload = {
        "note": "دليل التخصصات والبرامج الدراسية 2026/2027، مستخرج من صفحات دليل الطالب 74–242. "
                "لم تُضَف معلومة من خارج الدليل، وصُحّح فقط ما شوّهه استخراج النصّ العربي.",
        "source": source.name,
        "programs": programs,
    }
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fields = sorted({p["field"] for p in programs})
    types = sorted({p["programType"] for p in programs})
    institutions = {p["institution"] for p in programs if p["institution"]}
    print(f"برامج: {len(programs)} | مجالات: {len(fields)} | أنواع: {len(types)} | مؤسسات: {len(institutions)}")
    print(f"الملف: {target}")


if __name__ == "__main__":
    main()
