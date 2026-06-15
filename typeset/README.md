# עימוד "חידושים וביאורים" — בסגנון תומר דבורה

Typesets the halachic chiddushim from `source.docx` into a PDF that matches the
visual design of the reference *Tomer Devorah* sefer (page format, two-column
justified body, running headers with Hebrew folio numbers, decorative siman
dividers, bold run-in lead-words).

## Output
`חידושים-וביאורים.pdf` — 29 pages, 473.39 × 668.98 pt (167 × 236 mm, identical to
the reference), fonts embedded.

## Design system (measured from the reference PDF)
| Role | Reference font | Substitute (free, OFL) | Size |
|------|----------------|------------------------|------|
| Body | BATachkemoni-Light | David Libre Regular | 12pt / 16.5pt leading |
| Lead-word | BATachkemoni-Bold | David Libre Bold | 13.8pt |
| Source ref (parens) | BATachkemoni-Light | David Libre | 8.4pt |
| Siman heading | BAVilna-Bold | Frank Ruhl Libre Bold | 17.5pt |
| Running header | BAVilna-Bold | Frank Ruhl Libre Bold | 13pt |
| Title page | BATMTzlotana-Bold | Frank Ruhl Libre Black | 34pt |

The original commercial fonts (BAVilna / BATachkemoni / BATzlotana) are embedded
in the reference only as glyph-stripped subsets and cannot be reused, so close
free equivalents were chosen per the brief. The gray ornamental flourishes
(`orn_left/right/tail.png`) were vector-extracted from the reference itself.

## Regenerate
```bash
pip install PyMuPDF python-docx fonttools weasyprint
python3 build.py            # source.docx -> sefer.html
python3 -c "from weasyprint import HTML; HTML('sefer.html').write_pdf('חידושים-וביאורים.pdf')"
```

## Content handling
The source carried layout artifacts from its prior typesetting: repeated
page-header lines and paragraphs split mid-word across page breaks. `build.py`
removes the duplicate siman headers and rejoins the split paragraphs **without
altering any wording**. One sub-section whose siman header was missing in the
source is marked with a plain ornament divider rather than an invented number.
