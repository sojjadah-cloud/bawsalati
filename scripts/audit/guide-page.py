"""طباعة صفحة من دليل الطالب كما استخرجها pdftotext، للمراجعة اليدوية.

    GUIDE_TXT=<ملف النصّ> python scripts/audit/guide-page.py 144 145
    GUIDE_TXT=<ملف النصّ> python scripts/audit/guide-page.py --code EG007

الدليل هو المرجع عند اختلاف ملف الإكسل عنه. يُستحسن استخراج الدليل بوضع
الجداول كي تصطفّ الأعمدة مع رموزها:

    pdftotext -table -enc UTF-8 StudentGuide2026.pdf guide_table.txt
"""
import io
import os
import re
import sys

BIDI = re.compile(r"[‪-‮‎‏⁦-⁩]")

path = os.environ.get("GUIDE_TXT", "")
if not path or not sys.argv[1:]:
    sys.exit(__doc__)

pages = io.open(path, encoding="utf-8").read().split("\f")
args = sys.argv[1:]

numbers = []
if args[0] == "--code":
    for code in args[1:]:
        found = [i for i, p in enumerate(pages, 1) if code in p]
        print(f"### {code}: صفحات {found}")
        numbers += found
else:
    numbers = [int(a) for a in args]

for n in numbers:
    body = BIDI.sub("", pages[n - 1])
    print(f"#### ص {n}")
    print("\n".join(line.rstrip() for line in body.split("\n") if line.strip()))
    print()
