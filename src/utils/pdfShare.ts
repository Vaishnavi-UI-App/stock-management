import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { RefObject } from 'react';

async function buildPdf(element: HTMLElement): Promise<jsPDF> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const img = canvas.toDataURL('image/png');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight) {
    pdf.addImage(img, 'PNG', 0, 0, imgWidth, imgHeight);
  } else {
    // Multi-page: tile the image down the pages
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(img, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(img, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }
  return pdf;
}

export async function downloadPdfFromRef(ref: RefObject<HTMLElement | null>, fileName: string): Promise<void> {
  if (!ref.current) return;
  const pdf = await buildPdf(ref.current);
  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

export async function shareWhatsAppFromRef(
  ref: RefObject<HTMLElement | null>,
  fileName: string,
  shareText: string,
  fallbackPhone?: string,
): Promise<void> {
  if (!ref.current) return;
  const pdf = await buildPdf(ref.current);
  const name = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = pdf.output('blob');
  const file = new File([blob], name, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name, text: shareText });
      return;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
  }

  // Fallback: save locally + open WhatsApp with text
  pdf.save(name);
  const target = fallbackPhone ? `https://wa.me/${fallbackPhone}` : 'https://wa.me/';
  const text = encodeURIComponent(`${shareText}\n\n(PDF attached separately)`);
  window.open(`${target}?text=${text}`, '_blank');
}
