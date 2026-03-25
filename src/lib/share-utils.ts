import jsPDF from "jspdf";
import { formatDisplayDate } from "@/lib/utils";
import { PDF_PRIMARY, PDF_ACCENT, drawBrandedHeader, drawTableHeader, drawAmberDivider, addBrandedFooters } from "@/lib/pdf-brand";

export interface ShareSummaryData {
  title: string;
  lines: { label: string; value: string }[];
  areaBreakdown?: { area: string; value: string }[];
  companyName?: string;
}

export function generateShareText(data: ShareSummaryData): string {
  const parts = [data.title, "------------------"];
  data.lines.forEach((l) => parts.push(`${l.label}: ${l.value}`));
  if (data.areaBreakdown && data.areaBreakdown.length > 0) {
    parts.push("", "Area Breakdown:");
    data.areaBreakdown.forEach((a) => parts.push(`  ${a.area}: ${a.value}`));
  }
  return parts.join("\n");
}

export function shareViaWhatsApp(text: string) {
  const encoded = encodeURIComponent(text);
  // Try intent URI first (works in Android WebView), fall back to wa.me
  try {
    window.location.href = `whatsapp://send?text=${encoded}`;
  } catch {
    window.location.href = `https://wa.me/?text=${encoded}`;
  }
}

export function shareViaEmail(subject: string, text: string) {
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export function shareViaSMS(text: string) {
  window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
}

export function generateSummaryPDF(data: ShareSummaryData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Branded header
  let y = drawBrandedHeader(doc, {
    companyName: data.companyName,
    title: data.title,
    date: new Date(),
  });

  // Summary lines
  doc.setTextColor(30, 30, 30);
  data.lines.forEach((line) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(line.label, 25, y);
    doc.setFont("helvetica", "bold");
    doc.text(line.value, pageWidth - 25, y, { align: "right" });
    y += 9;
  });

  // Area breakdown
  if (data.areaBreakdown && data.areaBreakdown.length > 0) {
    y += 4;
    y = drawAmberDivider(doc, y);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_PRIMARY);
    doc.text("Area Breakdown", 25, y);
    y += 8;

    data.areaBreakdown.forEach((a) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(a.area, 30, y);
      doc.setFont("helvetica", "bold");
      doc.text(a.value, pageWidth - 25, y, { align: "right" });
      y += 8;
    });
  }

  // Branded footers with page numbers
  addBrandedFooters(doc, data.companyName);

  return doc.output("blob");
}

const isWebView = () => !!(window as any).Android || /wv|WebView/i.test(navigator.userAgent);

export async function sharePDFFile(blob: Blob, filename: string, title: string): Promise<boolean> {
  // Skip navigator.share in WebView — it exists but silently fails
  if (isWebView()) return false;

  try {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return true;
    }
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return true;
    console.warn("navigator.share failed:", e);
  }
  return false;
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (isWebView()) {
    // WebView often ignores anchor download — open blob URL as fallback
    window.open(url, "_blank");
    // Delay revoke so the external viewer can load
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    URL.revokeObjectURL(url);
  }
}
