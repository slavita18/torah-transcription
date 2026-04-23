import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  ShadingType,
} from 'docx';

function splitIntoDocParagraphs(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function buildParagraph(line, isRTL = true) {
  const isHeading = line.startsWith('**') && line.endsWith('**');
  const isSource = /^\[.+\]/.test(line);

  const cleanText = line.replace(/^\*\*|\*\*$/g, '').replace(/^#+\s*/, '');

  if (isHeading) {
    return new Paragraph({
      children: [new TextRun({ text: cleanText, bold: true, size: 28, color: '1e3a8a' })],
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.RIGHT,
      bidirectional: isRTL,
      spacing: { before: 240, after: 120 },
    });
  }

  if (isSource) {
    return new Paragraph({
      children: [new TextRun({ text: cleanText, italics: true, color: '5b21b6', size: 22 })],
      alignment: AlignmentType.RIGHT,
      bidirectional: isRTL,
      spacing: { before: 80, after: 80 },
    });
  }

  return new Paragraph({
    children: [new TextRun({ text: cleanText, size: 24 })],
    alignment: AlignmentType.RIGHT,
    bidirectional: isRTL,
    spacing: { before: 80, after: 80 },
  });
}

export async function exportToWord(transcription, metadata, typeName) {
  const lines = splitIntoDocParagraphs(transcription);

  const titlePara = new Paragraph({
    children: [new TextRun({ text: metadata.name || 'שיעור', bold: true, size: 40, color: '1e2a5e' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  });

  const subtitlePara = new Paragraph({
    children: [
      new TextRun({ text: `${metadata.maggid || ''}  |  ${metadata.topic || ''}  |  ${metadata.date || ''}`, size: 22, color: '6b7280' }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
  });

  const divider = new Paragraph({
    children: [new TextRun({ text: '─'.repeat(40), color: 'e5e7eb' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
  });

  const contentParagraphs = lines.map(line => buildParagraph(line));

  const doc = new Document({
    sections: [{
      properties: { bidi: true },
      children: [titlePara, subtitlePara, divider, ...contentParagraphs],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${metadata.name || 'תמלול'}_${typeName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
