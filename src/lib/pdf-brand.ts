import jsPDF from "jspdf";
import { formatDisplayDate } from "@/lib/utils";

// Brand colors (RGB) for jsPDF
export const PDF_PRIMARY: [number, number, number] = [101, 143, 64];   // olive green
export const PDF_ACCENT: [number, number, number] = [217, 175, 47];     // golden amber
export const PDF_DARK: [number, number, number] = [30, 41, 21];          // dark sidebar green
export const PDF_LIGHT_BG: [number, number, number] = [243, 240, 233];   // warm off-white

/**
 * Draw branded header bar with company name + title on olive green background.
 * Returns the new Y position after the header.
 */
export function drawBrandedHeader(
  doc: jsPDF,
  opts: { companyName?: string; title: string; subtitle?: string; date?: Date }
): number {
  const pw = doc.internal.pageSize.getWidth();
  let y = 10;

  // Green header bar
  const barHeight = opts.companyName ? 22 : 14;
  doc.setFillColor(...PDF_PRIMARY);
  doc.rect(0, 0, pw, barHeight + 8, "F");

  doc.setTextColor(255, 255, 255);
  if (opts.companyName) {
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(opts.companyName, pw / 2, y + 4, { align: "center" });
    y += 9;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(opts.title, pw / 2, y + 4, { align: "center" });
  y = barHeight + 8;

  // Subtitle + date below bar
  y += 5;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  if (opts.subtitle) {
    doc.text(opts.subtitle, pw / 2, y, { align: "center" });
    y += 4;
  }
  doc.text(`Generated on ${formatDisplayDate(opts.date || new Date())}`, pw / 2, y, { align: "center" });
  y += 5;

  // Amber divider
  doc.setDrawColor(...PDF_ACCENT);
  doc.setLineWidth(0.6);
  doc.line(15, y, pw - 15, y);
  doc.setLineWidth(0.2);
  y += 6;

  return y;
}

/**
 * Draw a table header row with olive green background and white text.
 */
export function drawTableHeader(
  doc: jsPDF,
  y: number,
  columns: { text: string; x: number; align?: "left" | "right" | "center" }[]
): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_PRIMARY);
  doc.rect(15, y - 4, pw - 30, 7, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  columns.forEach((col) => {
    doc.text(col.text, col.x, y, { align: col.align || "left" });
  });
  return y + 6;
}

/**
 * Draw amber divider line.
 */
export function drawAmberDivider(doc: jsPDF, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...PDF_ACCENT);
  doc.setLineWidth(0.5);
  doc.line(15, y, pw - 15, y);
  doc.setLineWidth(0.2);
  return y + 6;
}

/**
 * Draw branded area section header (light green tint).
 */
export function drawAreaSectionHeader(
  doc: jsPDF,
  y: number,
  label: string,
  rightText: string
): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(225, 238, 215); // light olive tint
  doc.rect(15, y - 4, pw - 30, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_DARK);
  doc.text(label, 18, y);
  doc.text(rightText, pw - 18, y, { align: "right" });
  return y + 7;
}

/**
 * Add branded footer + page numbers to every page.
 * Call AFTER all content is added.
 */
export function addBrandedFooters(doc: jsPDF, companyName?: string) {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    const fy = ph - 10;

    // Thin amber line
    doc.setDrawColor(...PDF_ACCENT);
    doc.setLineWidth(0.3);
    doc.line(15, fy - 3, pw - 15, fy - 3);

    // Company name (left) in olive
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_PRIMARY);
    doc.text(companyName || "CollectWeb", 15, fy);

    // Page number (right) in muted olive
    doc.setTextColor(140, 170, 120);
    doc.text(`Page ${i} of ${totalPages}`, pw - 15, fy, { align: "right" });
  }
}
