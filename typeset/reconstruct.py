# -*- coding: utf-8 -*-
"""Reconstruct usable Unicode fonts from the reference PDF's embedded CID subsets.
Each Type0 font carries a complete (for this work) glyph set indexed by GID, plus
a ToUnicode CMap giving GID->Unicode. We rebuild a proper cmap so the outlines can
be reused directly -> an exact visual match to the reference."""
import fitz, re, os
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

PDF = '/root/.claude/uploads/7e4dbe32-b5b5-5bec-adfc-5485474b3b7b/afc1ce57-________________.pdf'
OUT = '/tmp/recon'
os.makedirs(OUT, exist_ok=True)
doc = fitz.open(PDF)

def parse_tounicode(stream):
    """Return {code(int): unicode(int)} from a ToUnicode CMap stream."""
    txt = stream.decode('latin1')
    m = {}
    # bfchar blocks
    for blk in re.findall(r'beginbfchar(.*?)endbfchar', txt, re.S):
        for src, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            m[int(src, 16)] = int(dst[:4], 16)
    # bfrange blocks
    for blk in re.findall(r'beginbfrange(.*?)endbfrange', txt, re.S):
        for lo, hi, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            lo, hi, d = int(lo, 16), int(hi, 16), int(dst[:4], 16)
            for i in range(hi - lo + 1):
                m[lo + i] = d + i
    return m

def reconstruct(font_xref, tounicode_xref, out_name, family):
    buf = doc.extract_font(font_xref)[3]
    raw = os.path.join(OUT, out_name + '.raw.ttf')
    open(raw, 'wb').write(buf)
    f = TTFont(raw)
    order = f.getGlyphOrder()
    g2u = parse_tounicode(doc.xref_stream(tounicode_xref))
    uni2glyph = {}
    for gid, uni in g2u.items():
        if 0 <= gid < len(order) and uni not in (0, 0xFFFF):
            uni2glyph[uni] = order[gid]
    # Build fresh cmap (formats 4 + 12)
    cmap = f['cmap'] if 'cmap' in f else None
    from fontTools.ttLib import newTable
    cmt = newTable('cmap'); cmt.tableVersion = 0
    sub4 = CmapSubtable.getSubtableClass(4)(4)
    sub4.platformID, sub4.platEncID, sub4.language = 3, 1, 0
    sub4.cmap = dict(uni2glyph)
    sub12 = CmapSubtable.getSubtableClass(12)(12)
    sub12.platformID, sub12.platEncID = 3, 10
    sub12.language = 0; sub12.cmap = dict(uni2glyph)
    sub12.reserved = 0; sub12.length = 0; sub12.nGroups = 0
    # aliases: straight double-quote -> Hebrew gershayim glyph (U+201D); the docx
    # uses U+0022 for gershayim. Also right-bracket from left-bracket if absent.
    def alias(dst, src):
        if dst not in sub4.cmap and src in sub4.cmap:
            sub4.cmap[dst] = sub4.cmap[src]; sub12.cmap[dst] = sub12.cmap[src]
    alias(0x0022, 0x201D)   # " -> ”
    alias(0x0022, 0x05F4)
    alias(0x005D, 0x005B)   # ] -> [
    alias(0x0029, 0x0028)
    cmt.tables = [sub4, sub12]
    f['cmap'] = cmt
    # rename family
    f['name'].setName(family, 1, 3, 1, 0x409)
    f['name'].setName('Regular', 2, 3, 1, 0x409)
    f['name'].setName(family, 4, 3, 1, 0x409)
    f['name'].setName(family.replace(' ', ''), 6, 3, 1, 0x409)
    f['name'].setName(family, 16, 3, 1, 0x409)
    f['name'].setName('Regular', 17, 3, 1, 0x409)
    try:
        f['OS/2'].usWeightClass = 400
    except Exception:
        pass
    out = os.path.join(OUT, out_name + '.ttf')
    f.save(out)
    covered = ''.join(sorted(chr(u) for u in uni2glyph if 0x5D0 <= u <= 0x5EA))
    print(f'{out_name}: glyphs={len(order)} mapped={len(uni2glyph)} heb=[{covered}]')
    return out

jobs = [
    (35, 60, 'Tachkemoni-Light', 'BA Tachkemoni Light'),
    (42, 62, 'Tachkemoni-Bold',  'BA Tachkemoni Bold'),
    (34, 58, 'Vilna-Bold',       'BA Vilna Bold'),
    (99, 118,'Vilna-Medium',     'BA Vilna Medium'),
    (216,295,'Vilna-Regular',    'BA Vilna'),
]
for a, b, c, d in jobs:
    reconstruct(a, b, c, d)
EOF_GUARD = True
