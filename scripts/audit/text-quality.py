"""يرصد ما قد يكون خطأً في أسماء البرامج وشروطها.

    python scripts/audit/text-quality.py
    GUIDE_TXT=<نصّ الدليل> python scripts/audit/text-quality.py

استخراج النصّ العربي من الدليل يقلب الأقواس وينتزع النسب المئوية من مواضعها
ويبتر أوائل الأسطر. هذه الفحوص تكشف ما بقي من ذلك بعد التحويل. وإن مُرّر
نصّ الدليل في GUIDE_TXT قُوبلت كلُّ كلمة به، فما لا يظهر فيه مشبوه:

    pdftotext -table -enc UTF-8 StudentGuide2026.pdf guide_table.txt

يُصلَح ما يُرصد إمّا بقاعدة في scripts/xlsx-to-programs.py إن كان الخلل
مطّرداً، وإمّا بتصحيح في prisma/seed-data/program-overrides.json منقول عن
صفحة الدليل ومقترن برقمها.
"""
import collections
import json
import os
import re
import sys
from pathlib import Path

DATA = Path("prisma/seed-data/study-programs.json")
programs = json.loads(DATA.read_text(encoding="utf-8"))["programs"]

flags = collections.defaultdict(list)


def add(kind, program, detail=""):
    flags[kind].append((program["code"], (program["name"] or "")[:52], detail))


# نصّ لا يصلح أن يكون شرط قبول: خانة تشابكت بعمود آخر أو ضاع أكثرها
def is_wrecked(req: str) -> str:
    lines = [line.strip() for line in req.split("\n") if line.strip()]
    if not lines:
        return "بلا شروط مكتوبة"
    stubs = sum(1 for line in lines if len(line) < 8)
    if stubs / len(lines) >= 0.25:
        return f"{stubs} من {len(lines)} أسطر بقايا"
    if not re.search(r"(النجاح|الحصول|معدل|تقدير)", req):
        return "بلا عبارة قبول معروفة"
    return ""


# أوائل الأسطر تسقط في الاستخراج فتبقى الكلمة بترَ أوّلها
TRUNCATED = re.compile(
    r"^(ح في|صول على|ضيات|جاح|حصول|ول على|قل عن|يزية|زية|ناصرها|اح في"
    r"|يمياء|لحصول|لرياضيات|لنجاح|لمتقدمة|جليزية|يزتي)(?![ء-ي])"
)

for p in programs:
    name = p["name"] or ""
    req = p["requirements"] or ""

    if re.search(r"\)[^()]*\(", name) and not re.search(r"\([^()]*\)", name):
        add("قوسان مقلوبان في الاسم", p, name[:40])
    if name.strip().startswith(("-", ".", ":", "،", "*", "/")):
        add("الاسم يبدأ بعلامة ترقيم", p, repr(name[:24]))
    if len(name) > 95:
        add("اسم طويل جداً", p, f"{len(name)} حرفاً")
    if len(name.strip()) < 6:
        add("اسم قصير جداً", p, repr(name))
    if re.search(r"\d+\s*%", name):
        add("نسبة داخل الاسم", p, name[:40])
    # الأسماء الطويلة أوصافٌ ينقلها الدليل نفسه، وقد يرد فيها لفظ الشرط
    if len(name) <= 95 and re.search(
        r"الحصول على|النجاح في|بتقدير|حسم التعادل|لغة الدراسة", name
    ):
        add("شرط تسرّب إلى الاسم", p, name[:45])
    # كلمة عربية منفردة من حرف واحد: بقايا قطع
    if re.search(r"(?<![ء-ي])[ء-ي]\s+[ء-ي]{2,}", name):
        add("حرف منفصل في الاسم", p, name[:40])
    if "  " in name:
        add("مسافات مزدوجة", p, "")

    # الشروط
    if "٪" in req:
        add("علامة نسبة عربية لم تُحوَّل", p, "")
    if re.search(r"(?<![ء-ي])ال(?![ء-ي])", req):
        add("«ال» منفردة في الشروط", p, "")
    if re.search(r"\d%\(", req):
        add("نسبة انتُزعت من موضعها", p, "")
    if re.search(r"%\s*\d", req):
        add("علامة النسبة قبل رقمها", p, "")
    if req and not re.search(r"[ء-ي]", req):
        add("شروط بلا نصّ عربي", p, req[:30])
    for line in req.split("\n"):
        if TRUNCATED.match(line.strip()):
            add("سطر مبتور الأوّل", p, line.strip()[:45])
            break
    wrecked = is_wrecked(req)
    if wrecked:
        add("خانة شروط مشوّهة", p, wrecked)

# كلُّ كلمة عربية في الاسم أو الشروط يجب أن ترد في الدليل نفسه
guide_path = os.environ.get("GUIDE_TXT", "")
if guide_path and Path(guide_path).exists():
    noise = r"[‪-‮‎‏⁦-⁩ـً-ْ]"
    text = re.sub(noise, "", Path(guide_path).read_text(encoding="utf-8"))
    vocabulary = set(re.findall(r"[ء-ي]+", text))
    for p in programs:
        for field in ("name", "requirements"):
            for word in re.findall(r"[ء-ي]+", p[field] or ""):
                if len(word) > 2 and word not in vocabulary:
                    add("كلمة لا ترد في الدليل", p, word)

print(f"البرامج: {len(programs)}\n")
for kind, items in sorted(flags.items(), key=lambda kv: -len(kv[1])):
    print(f"── {kind}: {len(items)}")
    for code, name, detail in items[:6]:
        print(f"     {code}  {name}  {('| ' + detail) if detail else ''}")
    print()

# الأسماء الطويلة أوصافٌ أمينة للدليل، وما عداها خللٌ يُصلَح
SOFT = {"اسم طويل جداً", "كلمة لا ترد في الدليل", "قوسان مقلوبان في الاسم"}
hard = sum(len(v) for k, v in flags.items() if k not in SOFT)
print(f"ملاحظات تستوجب الإصلاح: {hard}")
sys.exit(1 if hard else 0)
