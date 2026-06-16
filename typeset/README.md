# עימוד "חידושים וביאורים" — בסגנון תומר דבורה

Typesets the halachic chiddushim from `source.docx` into a PDF that matches the
visual design of the reference *Tomer Devorah* sefer (page format, two-column
justified body, running headers with Hebrew folio numbers, decorative siman
dividers, bold run-in lead-words).

## Output
`חידושים-וביאורים.pdf` — 24 pages, 473.39 × 668.98 pt (167 × 236 mm, identical to
the reference), fonts embedded.

## Fonts — reconstructed from the reference (exact match)
The reference's commercial faces (BAVilna, BATachkemoni) are embedded only as
CID-keyed subsets with **no Unicode cmap**, so they don't drop into normal text.
`reconstruct.py` rebuilds usable Unicode TTFs directly from those subsets: it
extracts each `FontFile2`, parses the PDF `ToUnicode` CMap to recover
GID → Unicode, and writes a fresh `cmap` (plus a `"` → gershayim alias). The
result is the **original sefer typeface**, not a lookalike.

| Role | Reference font | Reconstructed file | Size |
|------|----------------|--------------------|------|
| Body | BATachkemoni-Light | `fonts/Tachkemoni-Light.ttf` | 12pt / 16.5pt leading |
| Lead letter | BATachkemoni-Bold | `fonts/Tachkemoni-Bold.ttf` | 13.8pt |
| Siman heading / running head | BAVilna-Medium | `fonts/Vilna-Medium.ttf` | 17.5 / 13pt |
| Title page | BAVilna-Bold | `fonts/Vilna-Bold.ttf` | 34pt |

Intentional foreign-language words (e.g. "Hashem") and `*` footnote marks fall
back to a system serif. The gray ornamental flourishes (`orn_left/right/tail.png`)
were vector-extracted from the reference itself.

## Regenerate
```bash
pip install PyMuPDF python-docx fonttools weasyprint
python3 reconstruct.py   # (only needed to rebuild fonts/ from the reference PDF)
python3 build.py            # source.docx -> sefer.html
python3 -c "from weasyprint import HTML; HTML('sefer.html').write_pdf('חידושים-וביאורים.pdf')"
```

## Content handling
The source carried layout artifacts from its prior typesetting: repeated
page-header lines and paragraphs split mid-word across page breaks. `build.py`
removes the duplicate siman headers and rejoins the split paragraphs **without
altering any wording**. One sub-section whose siman header was missing in the
source is marked with a plain ornament divider rather than an invented number.
