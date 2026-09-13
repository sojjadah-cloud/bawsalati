"""مطابقة برامج المنصة بصفحات دليل الطالب 74–242.

    pdftotext -enc UTF-8 content/StudentGuide2026.pdf all.txt   # ثم قسّمه بصفحاته
    python scripts/verify-programs.py <مجلد-الصفحات>

يفحص ثلاثة أشياء ولا يعدّل شيئاً:
  1. هل رمز كل برنامج موجود في الصفحة التي يعلنها؟
  2. هل مجاله يطابق نطاق صفحات مجاله في الدليل؟
  3. هل في الدليل برنامج ليس عند المنصة؟

يخرج برمز 1 إن وجد خللاً، فيصلح للتشغيل الآلي.
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# نطاقات المجالات الأكاديمية كما رتّبها الدليل
FIELD_PAGES = [
    ("الصحة", 74, 93),
    ("برامج دراسية متعددة التخصصات", 94, 108),
    ("العلوم الطبيعية والفيزيائية", 109, 116),
    ("الزراعة والبيئة والعلوم المرتبطة بها", 117, 121),
    ("الهندسة والتقنيات ذات الصلة", 122, 145),
    ("العمارة والإنشاء", 146, 152),
    ("تكنولوجيا المعلومات", 153, 169),
    ("التربية", 170, 187),
    ("الإدارة والمعاملات التجارية", 188, 206),
    ("المجتمع والثقافة", 207, 217),
    ("الفنون الإبداعية", 218, 225),
    ("الدين والفلسفة", 226, 228),
    ("البرامج المخصصة للطلبة ذوي الإعاقات الخاصة", 229, 242),
]

FIRST_PAGE, LAST_PAGE = 74, 242
CONTROL = re.compile(r"[​-‏‪-‮⁦-⁩﻿]")
CODE = re.compile(r"(?<![A-Za-z])([A-Z]{1,4}\d{3,4})(?![A-Za-z])")


def page_text(pages_dir: Path, number: int, cache: dict) -> str:
    if number not in cache:
        f = pages_dir / f"p{number:03d}.txt"
        cache[number] = CONTROL.sub("", f.read_text(encoding="utf-8")) if f.exists() else ""
    return cache[number]


def field_of(page: int):
    for name, first, last in FIELD_PAGES:
        if first <= page <= last:
            return name
    return None


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("مرّر مجلد صفحات الدليل النصّية")
    pages_dir = Path(sys.argv[1])
    data = json.loads(Path("prisma/seed-data/study-programs.json").read_text(encoding="utf-8"))
    programs = data["programs"]
    cache: dict = {}
    problems = 0

    print(f"برامج المنصة: {len(programs)}\n")

    # 1) الرمز في صفحته
    off_page = [p for p in programs if p["code"] not in page_text(pages_dir, p["page"], cache)]
    print(f"1. الرمز في الصفحة المعلنة: {len(programs) - len(off_page)}/{len(programs)}")
    for p in off_page[:10]:
        print(f"   ✘ {p['code']} يعلن صفحة {p['page']}")
    problems += len(off_page)

    # 2) المجال يطابق نطاق صفحته
    mismatched = [
        (p, field_of(p["page"]))
        for p in programs
        if field_of(p["page"]) != p["field"]
    ]
    print(f"\n2. المجال يطابق نطاق صفحته: {len(programs) - len(mismatched)}/{len(programs)}")
    for p, expected in mismatched[:10]:
        print(f"   ✘ {p['code']} صفحة {p['page']}: «{p['field']}» والنطاق يقول «{expected}»")
    problems += len(mismatched)

    # 3) برنامج في الدليل وليس عندنا
    ours = {p["code"] for p in programs}
    in_guide = defaultdict(set)
    for n in range(FIRST_PAGE, LAST_PAGE + 1):
        for code in CODE.findall(page_text(pages_dir, n, cache)):
            in_guide[code].add(n)
    known_prefixes = {re.match(r"[A-Z]+", c).group(0) for c in ours}
    missing = {
        c: sorted(p)
        for c, p in in_guide.items()
        if c not in ours and re.match(r"[A-Z]+", c).group(0) in known_prefixes
    }
    print(f"\n3. برامج في الدليل وليست عند المنصة: {len(missing)}")
    for code, where in sorted(missing.items())[:10]:
        print(f"   ✘ {code} في صفحات {where}")
    problems += len(missing)

    # جدول المرجع
    print("\n— المجالات الأكاديمية —")
    counts = defaultdict(int)
    for p in programs:
        counts[p["field"]] += 1
    for name, first, last in FIELD_PAGES:
        print(f"   {counts[name]:4d}  {name:<42} صفحات {first}–{last}")

    print(f"\n{'✅ البيانات مطابقة للدليل.' if problems == 0 else f'❌ {problems} خللاً.'}")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
