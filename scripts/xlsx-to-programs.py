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
    for wrong, right in LAM_ALEF_FIXES:
        text = text.replace(wrong, right)
    # أداة التعريف لا تقف وحدها كلمةً في العربية، فكل «ال» منفردة أصلها «لا»
    text = re.sub(r"(?<![^\W\d_])ال(?![^\W\d_])", "لا", text)
    # علامة النسبة تخرج قبل الرقم من الاستخراج المعكوس: «٪95» ← «95%»
    text = re.sub(r"٪\s*(\d+(?:\.\d+)?)", r"\1%", text)
    return "\n".join(fix_reversed_run(line) for line in text.split("\n"))


# مقطع لاتيني داخل سطر عربي ينتقل إلى أوّل السطر عند الاستخراج، فيبدأ السطر
# بقوس إغلاق: «).85%( • الحصول على معدل» وأصله «• الحصول على معدل (85%).»
REVERSED_RUN = re.compile(
    r"^(?P<pre>[^()\w]{0,3})\)(?P<tail>[^()]*?)(?P<num>\d+(?:\.\d+)?%?)\s*\((?P<head>.+)$"
)


def fix_reversed_run(line: str) -> str:
    match = REVERSED_RUN.match(line.strip())
    if match and match.group("head").strip():
        head = match.group("head").strip()
        tail = match.group("tail").strip()
        pre = match.group("pre")[::-1].strip()
        line = f"{head} ({match.group('num')}){tail}{pre}".strip()
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
    """اسم لاتيني بين قوسين يخرج مقلوب القوسين: «)Nursing(» ← «(Nursing)»."""
    stripped = text.strip()
    if stripped.startswith(")") and stripped.endswith("("):
        return "(" + stripped[1:-1] + ")"
    return text


def clean(value, single_line: bool) -> str:
    if value is None:
        return ""
    text = swap_wrapping_parens(fix_arabic(str(value)).replace("‏", "").replace("‎", ""))
    if single_line:
        text = re.sub(r"\s+", " ", text)
    else:
        text = re.sub(r"[ \t]+", " ", text)
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

    for row in rows[1:]:
        if not any(cell is not None for cell in row):
            continue
        record = {
            key: clean(row[index[column]], key in SINGLE_LINE)
            for key, column in COLUMNS.items()
        }
        if not record["code"] or not record["name"]:
            continue
        if record["code"] in seen:
            sys.exit(f"رمز مكرّر في الملف: {record['code']}")
        seen.add(record["code"])
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
