import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportToPdf(elementId, metadata, typeName) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('אלמנט לא נמצא');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let yOffset = margin;
  let remainingHeight = imgHeight;
  let sourceY = 0;

  while (remainingHeight > 0) {
    const availableHeight = pageHeight - 2 * margin;
    const sliceHeight = Math.min(remainingHeight, availableHeight);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = (sliceHeight / imgWidth) * canvas.width;

    const ctx = sliceCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);

    const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(sliceData, 'JPEG', margin, yOffset, imgWidth, sliceHeight);

    sourceY += sliceCanvas.height;
    remainingHeight -= sliceHeight;

    if (remainingHeight > 0) {
      pdf.addPage();
      yOffset = margin;
    }
  }

  // Footer on each page
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text(`${metadata.name || ''} | עמוד ${i} מתוך ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  pdf.save(`${metadata.name || 'תמלול'}_${typeName}.pdf`);
}

export function createPrintableElement(transcription, metadata, typeName) {
  const el = document.createElement('div');
  el.style.cssText = `
    direction: rtl;
    font-family: 'Heebo', 'Frank Ruhl Libre', serif;
    padding: 48px;
    background: #fff;
    color: #1f2937;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.8;
  `;

  el.innerHTML = `
    <div style="text-align:center; border-bottom: 2px solid #1e3a8a; padding-bottom:24px; margin-bottom:32px;">
      <h1 style="font-size:28px; font-weight:700; color:#1e2a5e; margin:0 0 8px;">${metadata.name || 'שיעור'}</h1>
      <div style="font-size:15px; color:#6b7280; display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
        ${metadata.maggid ? `<span>מגיד: ${metadata.maggid}</span>` : ''}
        ${metadata.topic ? `<span>נושא: ${metadata.topic}</span>` : ''}
        ${metadata.date ? `<span>תאריך: ${metadata.date}</span>` : ''}
      </div>
      <div style="margin-top:8px; font-size:13px; color:#9ca3af;">${typeName}</div>
    </div>
    <div style="font-size:17px; line-height:2; white-space:pre-wrap;">${transcription.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1e3a8a; font-size:19px; display:block; margin-top:20px; margin-bottom:4px;">$1</strong>').replace(/\[(.+?)\]/g, '<em style="color:#5b21b6;">[$1]</em>')}</div>
  `;

  return el;
}
