# -*- coding: utf-8 -*-
"""Typeset the halachic chiddushim docx in the visual style of the Tomer Devorah PDF."""
import docx, re, html, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source.docx')
OUT_HTML = os.path.join(HERE, 'sefer.html')

hdr_re = re.compile(r'^\s*(סימן|סי[\'׳])\s')
# sub-point: a NON-FINAL Hebrew letter at start followed by '.' or space or geresh
sub_re = re.compile(r'^\s*([אבגדהוזחטיכלמנסעפצקרשת])(?=[\.\s׳])')
END_PUNCT = set('.:?!')

def classify(s):
    s = s.strip()
    if not s:
        return ('BLANK', s)
    if hdr_re.match(s) and len(s) < 28:
        return ('HEADER', s)
    m = sub_re.match(s)
    if m:
        return ('SUB', s)
    return ('BODY', s)

def ends_open(text):
    """True if paragraph appears truncated by a page break (a continuation).
    Conservative: only when the text ends in a bare Hebrew letter or a comma,
    which in this source reliably marks a layout split rather than a real
    paragraph end. Endings in . : ? ! ) ' " are treated as complete."""
    t = text.rstrip().rstrip('* ').rstrip()
    if not t:
        return False
    last = t[-1]
    return ('א' <= last <= 'ת') or last == ','

def load_blocks():
    doc = docx.Document(SRC)
    raw = [classify(p.text) for p in doc.paragraphs]
    raw = [(c, t) for (c, t) in raw if c != 'BLANK']

    # Pass 1: drop duplicate page-header artifacts.
    # A HEADER is a *real* section start only if it is the first header OR the
    # following content paragraph is sub-point 'א' (a fresh enumeration).
    cleaned = []
    for i, (c, t) in enumerate(raw):
        if c == 'HEADER':
            # look ahead to next non-header content
            nxt = None
            for j in range(i+1, len(raw)):
                if raw[j][0] != 'HEADER':
                    nxt = raw[j]
                    break
            is_real = bool(nxt and nxt[0] == 'SUB' and nxt[1].lstrip()[0] == 'א')
            if not is_real:
                continue  # repeated running-header artifact -> drop
        cleaned.append((c, t))

    # Pass 2: build sections / paragraphs, merging page-break continuations.
    sections = []
    cur = None  # current section dict
    def new_section(header_text):
        nonlocal cur
        cur = {'siman': header_text, 'paras': []}
        sections.append(cur)

    for c, t in cleaned:
        if c == 'HEADER':
            new_section(t.strip())
            continue
        if cur is None:
            # orphan content before any header (shouldn't happen) -> bucket
            new_section(None)
        if c == 'SUB':
            cur['paras'].append({'type': 'sub', 'text': t.strip()})
        else:  # BODY
            paras = cur['paras']
            if paras and ends_open(paras[-1]['text']):
                # merge into previous block (page-break split)
                prev = paras[-1]['text']
                nxt = t.strip()
                # mid-word split -> next begins with a final-form letter
                if nxt and nxt[0] in 'ךםןףץ':
                    prev = prev.rstrip('* ').rstrip()
                    paras[-1]['text'] = prev + nxt
                else:
                    paras[-1]['text'] = prev.rstrip() + ' ' + nxt
            else:
                paras.append({'type': 'body', 'text': t.strip()})

    # Pass 3: detect orphan section starts (a 'א' sub-point opening a section
    # whose header is None -> mark for ornamental divider). Only relevant for the
    # one section that begins mid-stream without its own siman header.
    return sections

# ---------- Hebrew rendering helpers ----------
def esc(s):
    return html.escape(s)

def render_sub(text):
    """Bold the leading letter+separator of a sub-point."""
    m = re.match(r'^\s*([אבגדהוזחטיכלמנסעפצקרשת])([\.\s׳]\s*)(.*)$', text, re.S)
    if not m:
        return esc(text)
    letter, sep, rest = m.group(1), m.group(2), m.group(3)
    sep = sep.replace(' ', ' ').rstrip(' ') + ' '
    return f'<span class="lead">{esc(letter)}{esc(sep)}</span>{render_inline(rest)}'

def render_inline(text):
    """Style source references in (parentheses) smaller, like the reference."""
    out = []
    i = 0
    for m in re.finditer(r'\(([^()]*)\)', text):
        out.append(esc(text[i:m.start()]))
        out.append(f'<span class="src">({esc(m.group(1))})</span>')
        i = m.end()
    out.append(esc(text[i:]))
    return ''.join(out)

# ---------- HTML assembly ----------
HEAD = '''<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<title>חידושים וביאורים על שולחן ערוך אורח חיים</title>
<meta name="description" content="הלכות קריאת שמע ותפילה">
<link rel="stylesheet" href="style.css"></head><body>
'''
FOOT = '''
</body></html>'''

def main():
    sections = load_blocks()
    parts = [HEAD]
    # opening title block (chapter-style opener)
    parts.append('<section class="opener">')
    parts.append('<div class="opener-title">חידושים וביאורים</div>')
    parts.append('<div class="opener-sub">על שולחן ערוך אורח חיים &#8226; הלכות קריאת שמע ותפילה</div>')
    parts.append('<img class="opener-orn" src="orn_tail.png">')
    parts.append('</section>')

    parts.append('<div class="flow">')
    first = True
    for sec in sections:
        siman = sec['siman']
        if siman is None:
            # orphan section -> plain ornamental divider, no siman text
            parts.append('<div class="orphan-div"><img src="orn_tail.png"></div>')
            simhead = ''
        else:
            cls = 'simhead' + (' first' if first else '')
            simhead = esc(siman)
            # short running-head label: normalise "סי'" -> "סימן", drop "סעיף ..."
            run = re.sub(r"^\s*סי['׳]", 'סימן', siman.strip())
            run = re.sub(r'\s*סעיף.*$', '', run).strip().rstrip('.')
            parts.append(
                f'<h2 class="{cls}" data-runhead="{esc(run)}">'
                f'<img class="fl fl-r" src="orn_right.png">'
                f'<span class="simtext">{simhead}</span>'
                f'<img class="fl fl-l" src="orn_left.png"></h2>')
        first = False
        emitted = 0
        for p in sec['paras']:
            if p['type'] == 'sub':
                letter = p['text'].lstrip()[0]
                # a fresh 'א' that is not the section's opening sub-point marks a
                # header-less sub-section (the source lost its siman line) -> divider
                if letter == 'א' and emitted > 0:
                    parts.append('<div class="orphan-div"><img src="orn_tail.png"></div>')
                parts.append(f'<p class="bp sub">{render_sub(p["text"])}</p>')
            else:
                parts.append(f'<p class="bp">{render_inline(p["text"])}</p>')
            emitted += 1

    parts.append('<div class="endpiece"><img src="orn_tail.png"></div>')
    parts.append('</div>')  # .flow
    parts.append(FOOT)
    open(OUT_HTML, 'w', encoding='utf-8').write('\n'.join(parts))
    print('wrote', OUT_HTML, 'sections=', len(sections),
          'paras=', sum(len(s['paras']) for s in sections))

if __name__ == '__main__':
    main()
