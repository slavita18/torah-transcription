#!/usr/bin/env python3
"""Rebuild the "פרדס התורה" newsletter, replacing the template's text (parshas
Shoftim) with new content (parshas Pinchas) from a Word document, while keeping
the original design, section names (מדורים) and layout intact.

The four sections map to the template's four "type" headers:
    א געדאנק  -> פנינים ופרפראות
    א שמועס   -> מעלת הייחוס
    א הלכה    -> דין המועדות לעתיד לבוא
    א חידוש   -> בענין היתר עשיית גורל

Body text is re-flowed with per-column auto-fit so everything stays on the
original two pages. Fonts: Frank Ruhl Libre (OFL) closely matching the
template's Frank Ruhl typeface.

Usage:  python3 build.py
Requires: pymupdf, python-docx  (pip install pymupdf python-docx)
"""
import fitz, os
from docx import Document
from statistics import median

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
SRC = "source/template-shoftim.pdf"
DOCX = "source/content-pinchas.docx"
OUT = "pardes-hatorah-pinchas.pdf"

GRAY = (0.8547036051750183, 0.8537575602531433, 0.8360112905502319)  # column fill
TITLE_COL = "#77797c"      # topic-title gray
BODY_COL = "#231f20"       # body ink
MAST_COL = "#0a385f"       # masthead dark slate

doc = Document(DOCX)
P = [p.text.strip() for p in doc.paragraphs]

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

# ---- section content (by docx paragraph index) ----
sec_gedank  = [p for p in P[5:10]  if p]
sec_shmues  = [p for p in P[12:23] if p]
sec_halacha = [p for p in P[25:37] if p]
sec_chidush = [p for p in P[39:45] if p]
subtitle1   = P[4]   # 'ריח ניחוח' ...

CSS = """
@font-face { font-family: frank;  src: url(fonts/frank-reg.ttf); }
@font-face { font-family: frankb; src: url(fonts/frank-bold.ttf); }
* { font-family: frank; }
.body { direction: rtl; text-align: justify; color: %s; font-size: 11px; line-height: 1.33; }
.body p { margin: 0 0 4.5px 0; }
.body p.sub { font-family: frankb; font-weight: bold; text-align: center; font-size: 12.5px;
              margin: 0 0 7px 0; color: %s; }
.ttl { direction: rtl; text-align: center; font-family: frankb; color: %s; }
.mast{ direction: rtl; text-align: center; font-family: frankb; color: %s; }
""" % (BODY_COL, BODY_COL, TITLE_COL, MAST_COL)

arch = fitz.Archive(HERE)
pdf = fitz.open(SRC)

def body_html(paras, subtitle=None):
    h = '<div class="body">'
    if subtitle:
        h += '<p class="sub">%s</p>' % esc(subtitle)
    h += "".join("<p>%s</p>" % esc(p) for p in paras)
    return h + "</div>"

# ---- 1. bodies: mask old text with column gray, flow new text (auto-fit) ----
sections = [
    # page, mask-rect,          body-rect,          paras,        subtitle
    (0, (310,268,577,755), (311,270,576,752), sec_gedank,  subtitle1),
    (0, ( 33,268,281,755), ( 35,270,279,752), sec_shmues,  None),
    (1, (303, 63,575,551), (305, 66,573,549), sec_halacha, None),
    (1, ( 32, 63,286,551), ( 34, 66,284,549), sec_chidush, None),
]
for pno, mask, brect, paras, sub in sections:
    page = pdf[pno]
    page.draw_rect(fitz.Rect(*mask), color=None, fill=GRAY)
    spare, scale = page.insert_htmlbox(fitz.Rect(*brect), body_html(paras, sub),
                                       css=CSS, archive=arch, scale_low=0.1)
    print(f"page{pno+1} section fit scale={scale:.3f} spare={spare:.1f}")

# ---- 2. topic titles: mask between the two rules, write new title ----
# (page1-right 'פנינים ופרפראות' is unchanged, so it is left untouched)
titles = [
    # page, rule-x0,x1, rule-y-top,y-bot, new title
    (0,  41, 135, 244.2, 259.0, "מעלת הייחוס"),
    (1, 324, 440,  38.9,  53.7, "דין המועדות לעתיד לבוא"),
    (1,  54, 171,  40.9,  55.8, "בענין היתר עשיית גורל"),
]
for pno, x0, x1, yt, yb, txt in titles:
    page = pdf[pno]
    page.draw_rect(fitz.Rect(x0+1, yt+0.8, x1-1, yb-0.8), color=None, fill=GRAY)
    tcss = CSS + ".ttl{font-size:11px;line-height:1.0;}"
    page.insert_htmlbox(fitz.Rect(x0-4, yt+0.5, x1+4, yb-0.2),
                        '<div class="ttl">%s</div>' % esc(txt),
                        css=tcss, archive=arch, scale_low=0.1)

# ---- 3. masthead: rebuild parchment gradient, write new issue line ----
page = pdf[0]
pix = page.get_pixmap(matrix=fitz.Matrix(1, 1))
TX0, TX1 = 78, 536
for yi in range(45, 71):
    samp = [pix.pixel(sx, yi)[:3] for sx in (72, 74, 76, 538, 540, 542)]
    r = median(s[0] for s in samp); g = median(s[1] for s in samp); bl = median(s[2] for s in samp)
    page.draw_line(fitz.Point(TX0, yi + 0.5), fitz.Point(TX1, yi + 0.5),
                   color=(r/255, g/255, bl/255), width=1.25)
mast_full = P[1] + '  ·  יוצא לאור על ידי כולל אברכים ד\'אלפיין עיקערס\''
mcss = CSS + ".mast{font-size:13px;line-height:1.0;}"
page.insert_htmlbox(fitz.Rect(70, 47, 544, 70), '<div class="mast">%s</div>' % esc(mast_full),
                    css=mcss, archive=arch, scale_low=0.1)

pdf.save(OUT, deflate=True, garbage=3)
print("saved", OUT)
