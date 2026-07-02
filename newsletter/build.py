#!/usr/bin/env python3
"""Rebuild the "פרדס התורה" newsletter, replacing the template's text (parshas
Shoftim) with new content (parshas Pinchas) from a Word document, while keeping
the original design, section names (מדורים) and layout intact.

Fonts: the ACTUAL typefaces embedded in the template PDF (Frank Ruhl, FbLoaHari,
BATzarfati, EFTTefilot ...), recovered as usable TTFs by reconstruct_fonts.py +
complete_fonts.py, so the new text matches the original exactly. See README.md.

The four sections map to the template's four "type" headers:
    א געדאנק  -> פנינים ופרפראות
    א שמועס   -> מעלת הייחוס
    א הלכה    -> דין המועדות לעתיד לבוא   (column widened so it is not cramped)
    א חידוש   -> בענין היתר עשיית גורל

The bottom "פטרון השבוע" grid is replaced by a single enlarged dedication card
(משה גרינפעלד), which frees the vertical space used to widen the halacha column.

Usage:  python3 build.py
Requires: pymupdf, python-docx  (pip install pymupdf python-docx)
"""
import fitz, os
from docx import Document
from statistics import median

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
SRC  = "source/template-shoftim.pdf"
DOCX = "source/content-pinchas.docx"
OUT  = "pardes-hatorah-pinchas.pdf"
FD   = "fonts"

# --- issue line numbers (the Word doc left גליון/שנה blank) ---
ISSUE = 'פרשת פינחס תשפ"ו  ·  גליון א\'  ·  שנה כ\''
# --- the single weekly patron ---
PATRON = "משה גרינפעלד"

GRAY   = (0.8547036051750183, 0.8537575602531433, 0.8360112905502319)
BROWN  = (0.5490000247955322, 0.40400001406669617, 0.22699999809265137)
CREAM  = (0.9879999756813049, 0.9760000109672546, 0.9179999828338623)
BORDER = (0.2709392011165619, 0.2682535946369171, 0.16369879245758057)
BODY_COL="#231f20"; TITLE_COL="#77797c"; MAST_COL="#0a385f"; OLIVE="#63603f"

doc = Document(DOCX); P=[p.text.strip() for p in doc.paragraphs]
# MuPDF/HarfBuzz mirror ()[] in RTL runs (so "(" would show as ")"), but the
# template keeps them un-mirrored. The body fonts map these non-mirrored
# "Other Neutral" codepoints to the ()[] glyphs; remapping the text to them
# keeps correct RTL position without the mirroring.
_PAR = {ord('('):'†', ord(')'):'‡', ord('['):'§', ord(']'):'¶'}
def fixp(s): return s.translate(_PAR)
def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

sec_gedank  = [p for p in P[5:10]  if p]
sec_shmues  = [p for p in P[12:23] if p]
sec_halacha = [p for p in P[25:37] if p]
sec_chidush = [p for p in P[39:45] if p]
subtitle1   = P[4]

CSS = f"""
@font-face {{ font-family: frank;  src: url({FD}/frank-reg.ttf); }}
@font-face {{ font-family: frankb; src: url({FD}/frank-bold.ttf); }}
@font-face {{ font-family: tzar;   src: url({FD}/tzarfati.ttf); }}
@font-face {{ font-family: loa;    src: url({FD}/loahari.ttf); }}
@font-face {{ font-family: tef;    src: url({FD}/tefilot.ttf); }}
.body {{ direction: rtl; text-align: justify; color: {BODY_COL}; font-family: frank; font-size: 9.7px; line-height: 1.36; }}
.body p {{ margin: 0 0 4.5px 0; }}
.body p.sub {{ font-family: frankb; text-align: center; font-size: 13px; margin: 0 0 7px 0; }}
.ttl  {{ direction: rtl; text-align: center; font-family: tzar; color: {TITLE_COL}; font-size: 12px; line-height: 1.0; }}
.mast {{ direction: rtl; text-align: center; font-family: loa;  color: {MAST_COL}; font-size: 15px; line-height: 1.0; }}
.card {{ direction: rtl; text-align: center; color: {OLIVE}; }}
.card .pat    {{ font-family: tef;    font-size: 20px; letter-spacing: 2px; margin: 0 0 3px 0; }}
.card .parsha {{ font-family: frankb; font-size: 10px; margin: 0; }}
.card .hon    {{ font-family: frankb; font-size: 10px; margin: 2px 0 0 0; }}
.card .name   {{ font-family: frankb; font-size: 16px; margin: 1px 0; }}
.card .brk    {{ font-family: frank;  font-size: 8px; line-height: 1.3; margin: 3px 16px 0 16px; }}
"""
arch = fitz.Archive(HERE); pdf = fitz.open(SRC)

def body_html(paras, sub=None):
    h='<div class="body">'
    if sub: h+='<p class="sub">%s</p>'%esc(fixp(sub))
    return h+"".join("<p>%s</p>"%esc(fixp(p)) for p in paras)+"</div>"

# page, mask-rect, body-rect, paras, subtitle, mode  (page-2 columns extended to y=649)
# mode "fill" = stretch line spacing to fill the whole box; "fit" = shrink-to-fit
sections=[
    (0,(310,268,577,755),(311,270,576,752),sec_gedank, subtitle1,"fill"),
    (0,( 33,268,281,755),( 35,270,279,752),sec_shmues, None,     "fit"),
    (1,(303, 63,575,551),(305, 66,573,649),sec_halacha,None,     "fit"),
    (1,( 32, 63,286,551),( 34, 66,284,649),sec_chidush,None,     "fill"),
]
for pno,mask,brect,paras,sub,mode in sections:
    pdf[pno].draw_rect(fitz.Rect(*mask),color=None,fill=GRAY)  # mask old body

# ---- extend page-2 column frames downward, erasing the old card grid ----
p2=pdf[1]
p2.draw_rect(fitz.Rect(0,548,612,758),color=None,fill=BROWN)
FILLB=655; INB=653.8; OUTB=656.4
for fx0,fx1,ox0,ox1,ix0,ix1,w in [
    (300.2,577.8, 298.9,579.0, 301.5,576.5, 1.28),   # halacha column
    ( 28.6,288.6,  27.3,289.9,  30.0,287.2, 1.33),   # chidush column
]:
    p2.draw_rect(fitz.Rect(fx0,546,fx1,FILLB),color=None,fill=GRAY)
    for x in (ox0,ox1): p2.draw_line(fitz.Point(x,548),fitz.Point(x,OUTB),color=CREAM,width=w)
    p2.draw_line(fitz.Point(ox0,OUTB),fitz.Point(ox1,OUTB),color=CREAM,width=w)
    for x in (ix0,ix1): p2.draw_line(fitz.Point(x,548),fitz.Point(x,INB),color=CREAM,width=w)
    p2.draw_line(fitz.Point(ix0,INB),fitz.Point(ix1,INB),color=CREAM,width=w)

# ---- flow bodies ----
def measure(page, brect, html, css):
    tmp=fitz.open(); tp=tmp.new_page(width=page.rect.width,height=page.rect.height)
    return tp.insert_htmlbox(fitz.Rect(*brect),html,css=css,archive=arch,scale_low=0.1)
def place_body(page, brect, html, mode):
    if mode=="fill":                      # fill the box: raise size (cap 11.5), then leading
        fs=9.7
        while fs<11.5:
            css=CSS+f".body{{font-size:{fs+0.3:.2f}px;line-height:1.45;}}"
            spare,scale=measure(page,brect,html,css)
            if scale>=0.999 and spare>=6: fs+=0.3
            else: break
        lo,hi,best=1.30,2.6,1.45
        for _ in range(16):
            mid=(lo+hi)/2
            css=CSS+f".body{{font-size:{fs:.2f}px;line-height:{mid:.3f};}}"
            spare,scale=measure(page,brect,html,css)
            if scale>=0.999 and spare>=3: best=mid; lo=mid
            else: hi=mid
        css=CSS+f".body{{font-size:{fs:.2f}px;line-height:{best:.3f};}}"
        page.insert_htmlbox(fitz.Rect(*brect),html,css=css,archive=arch,scale_low=0.1)
        return f"fs={fs:.1f} lh={best:.2f}"
    else:                                 # shrink-to-fit
        spare,scale=measure(page,brect,html,CSS)
        page.insert_htmlbox(fitz.Rect(*brect),html,css=CSS,archive=arch,scale_low=0.1)
        return f"scale={scale:.3f}"
for pno,mask,brect,paras,sub,mode in sections:
    info=place_body(pdf[pno],brect,body_html(paras,sub),mode)
    print(f"page{pno+1} {mode} {info}")

# ---- topic titles (real BATzarfati); page-1 'פנינים ופרפראות' is unchanged ----
for pno,x0,x1,yt,yb,txt in [
    (0, 41,135,244.2,259.0,"מעלת הייחוס"),
    (1,324,440, 38.9, 53.7,"דין המועדות לעתיד לבוא"),
    (1, 54,171, 40.9, 55.8,"בענין היתר עשיית גורל"),
]:
    page=pdf[pno]
    page.draw_rect(fitz.Rect(x0+1,yt+0.8,x1-1,yb-0.8),color=None,fill=GRAY)
    page.insert_htmlbox(fitz.Rect(x0-6,yt-0.6,x1+6,yb+0.4),'<div class="ttl">%s</div>'%esc(txt),
                        css=CSS,archive=arch,scale_low=0.1)

# ---- single enlarged dedication card ----
CX0,CY0,CX1,CY1 = 132,662,480,752
p2.draw_rect(fitz.Rect(CX0,CY0,CX1,CY1),color=BORDER,fill=CREAM,width=1.1,radius=0.06)
p2.draw_rect(fitz.Rect(CX0+2.5,CY0+2.5,CX1-2.5,CY1-2.5),color=BORDER,fill=None,width=0.7,radius=0.06)
# ---- remove the summer thank-you footer line (keep the page-number footer) ----
p2.draw_rect(fitz.Rect(48,758,505,782),color=None,fill=BROWN)

card=('<div class="card"><div class="pat">פטרון השבוע</div>'
      '<div class="parsha">פרשת פינחס</div>'
      '<div class="hon">ידידינו הדגול הרבני הנגיד</div>'
      f'<div class="name">מוהר"ר {esc(PATRON)} שליט"א</div>'
      '<div class="brk">זכות התורה הקדושה יעמוד לו ולב"ב להצליח בכל מעשי ידיו ברו"ג '
      'והריקותי לכם ברכה עד בלי די, שמחה ונחת וכט"ס</div></div>')
p2.insert_htmlbox(fitz.Rect(CX0+7,CY0+7,CX1-7,CY1-6),card,css=CSS,archive=arch,scale_low=0.1)

# ---- masthead (real FbLoaHari): rebuild parchment gradient, write issue line ----
page=pdf[0]; pix=page.get_pixmap(matrix=fitz.Matrix(1,1)); TX0,TX1=78,536
for yi in range(45,71):
    samp=[pix.pixel(sx,yi)[:3] for sx in (72,74,76,538,540,542)]
    r=median(s[0] for s in samp); g=median(s[1] for s in samp); bl=median(s[2] for s in samp)
    page.draw_line(fitz.Point(TX0,yi+0.5),fitz.Point(TX1,yi+0.5),color=(r/255,g/255,bl/255),width=1.25)
mast=ISSUE+'  ·  יוצא לאור על ידי כולל אברכים ד\'אלפיין עיקערס\''
page.insert_htmlbox(fitz.Rect(66,45,548,71),'<div class="mast">%s</div>'%esc(mast),css=CSS,archive=arch,scale_low=0.1)

pdf.save(OUT,deflate=True,garbage=3); print("saved",OUT)
