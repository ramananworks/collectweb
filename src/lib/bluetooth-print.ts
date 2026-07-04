// Bluetooth thermal receipt printing (2" / 3" rolls) via Android WebView bridge.
// The Android host app is expected to expose one of these methods:
//   window.Android.printReceipt(text: string, widthMm: number)  // preferred
//   window.Android.printText(text: string)                      // fallback
// When neither exists (regular browser), we fall back to the browser print dialog
// so the receipt can still be sent to any paired system Bluetooth printer.

import "@/lib/haptics"; // ensures the Window.Android global augmentation is loaded

import { formatCurrency } from "@/hooks/use-data";

export type PaperWidth = 58 | 80; // mm — 2 inch and 3 inch rolls
const CHARS_PER_LINE: Record<PaperWidth, number> = { 58: 32, 80: 48 };

const STORAGE_WIDTH = "cw:print:width";
const STORAGE_AUTO = "cw:print:auto";

export function getPaperWidth(): PaperWidth {
  const v = Number(localStorage.getItem(STORAGE_WIDTH));
  return v === 80 ? 80 : 58;
}
export function setPaperWidth(w: PaperWidth) {
  localStorage.setItem(STORAGE_WIDTH, String(w));
}
export function getAutoPrint(): boolean {
  return localStorage.getItem(STORAGE_AUTO) === "1";
}
export function setAutoPrint(v: boolean) {
  localStorage.setItem(STORAGE_AUTO, v ? "1" : "0");
}

export function isBluetoothPrintingAvailable(): boolean {
  return typeof window !== "undefined" && !!(
    window.Android?.printReceipt ||
    window.Android?.printText ||
    window.Android?.printBluetooth
  );
}

export interface ReceiptData {
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  customerName: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentDate: string;
  amount: number;
  mode: string;
  collectedBy: string;
  notes?: string;
  outstandingAfter: number;
  receiptNumber?: string;
}

function line(char = "-", width = 32) {
  return char.repeat(width);
}
function pad(left: string, right: string, width: number): string {
  const l = left ?? "";
  const r = right ?? "";
  const space = Math.max(1, width - l.length - r.length);
  if (l.length + r.length >= width) {
    // wrap: put value on next line right-aligned
    return `${l}\n${r.padStart(width)}`;
  }
  return `${l}${" ".repeat(space)}${r}`;
}
function center(text: string, width: number): string {
  const t = text.trim();
  if (t.length >= width) return t.slice(0, width);
  const pad = Math.floor((width - t.length) / 2);
  return " ".repeat(pad) + t;
}
function wrap(text: string, width: number): string {
  if (!text) return "";
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.join("\n");
}

function modeLabel(m: string): string {
  switch (m) {
    case "cash": return "CASH";
    case "upi": return "UPI";
    case "bank_transfer": return "BANK TRANSFER";
    default: return m.toUpperCase();
  }
}

export function formatReceipt(data: ReceiptData, widthMm: PaperWidth = getPaperWidth()): string {
  const W = CHARS_PER_LINE[widthMm];
  const rows: string[] = [];

  // Header
  rows.push(center(data.companyName.toUpperCase(), W));
  if (data.companyAddress) rows.push(...wrap(data.companyAddress, W).split("\n").map((l) => center(l, W)));
  if (data.companyPhone) rows.push(center(`Ph: ${data.companyPhone}`, W));
  rows.push(line("=", W));
  rows.push(center("PAYMENT RECEIPT", W));
  rows.push(line("=", W));

  // Meta
  if (data.receiptNumber) rows.push(pad("Receipt #", data.receiptNumber, W));
  rows.push(pad("Date", data.paymentDate, W));
  rows.push(line("-", W));

  // Customer
  rows.push(`Party : ${data.customerName}`);
  if (data.invoiceNumber) rows.push(pad("Invoice", data.invoiceNumber, W));
  if (data.invoiceDate) rows.push(pad("Inv Date", data.invoiceDate, W));
  rows.push(line("-", W));

  // Amount block
  rows.push(pad("Mode", modeLabel(data.mode), W));
  rows.push(pad("AMOUNT PAID", formatCurrency(data.amount), W));
  rows.push(line("-", W));
  rows.push(pad("Balance Due", formatCurrency(data.outstandingAfter), W));
  rows.push(line("=", W));

  // Footer
  rows.push(`Collected By: ${data.collectedBy}`);
  if (data.notes) rows.push(...wrap(`Note: ${data.notes}`, W).split("\n"));
  rows.push("");
  rows.push(center("Thank you!", W));
  rows.push("");
  rows.push("");
  rows.push("");

  return rows.join("\n");
}

/**
 * Send a formatted receipt to the paired Bluetooth printer.
 * Uses Android bridge when running inside the mobile WebView; otherwise opens
 * the browser print dialog so users can choose a system printer.
 * Returns true when handoff succeeded (does not guarantee physical print).
 */
export function printReceipt(data: ReceiptData, widthMm: PaperWidth = getPaperWidth()): boolean {
  const text = formatReceipt(data, widthMm);
  try {
    if (window.Android?.printReceipt) {
      window.Android.printReceipt(text, widthMm);
      return true;
    }
    if (window.Android?.printText) {
      window.Android.printText(text);
      return true;
    }
    // Alternate bridge: address-based, base64 payload
    if (window.Android?.printBluetooth) {
      const saved = getSavedPrinter();
      const target = saved?.id || pickFirstBluetoothAddress();
      if (target) {
        const b64 = typeof btoa !== "undefined"
          ? btoa(unescape(encodeURIComponent(text)))
          : text;
        window.Android.printBluetooth(target, b64);
        return true;
      }
    }
  } catch (e) {
    console.error("Android print bridge failed", e);
  }

  // Browser fallback — open a print window with monospace text
  try {
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return false;
    const pageWidthMm = widthMm;
    w.document.write(`<!doctype html><html><head><title>Receipt</title>
      <style>
        @page { size: ${pageWidthMm}mm auto; margin: 2mm; }
        body { font-family: 'Courier New', ui-monospace, monospace; font-size: 11px; white-space: pre; margin: 0; padding: 4px; }
      </style></head><body>${text.replace(/[<&>]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 200);
    return true;
  } catch (e) {
    console.error("Browser print fallback failed", e);
    return false;
  }
}

// ---------------- Bluetooth device pairing (Android bridge) ----------------

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  paired?: boolean;
}

const STORAGE_DEVICE = "cw:print:device";

export function hasPrinterBridge(): boolean {
  return typeof window !== "undefined" && !!(
    window.Android?.listBluetoothPrinters || window.Android?.getBluetoothDevices
  );
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function pickFirstBluetoothAddress(): string | null {
  const list = listPrinters();
  return list[0]?.id || null;
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function listPrinters(): BluetoothPrinterDevice[] {
  try {
    const raw = window.Android?.listBluetoothPrinters?.();
    return safeParse<BluetoothPrinterDevice[]>(raw, []);
  } catch (e) {
    console.error("listBluetoothPrinters failed", e);
    return [];
  }
}

export function connectPrinter(id: string): { ok: boolean; message?: string } {
  try {
    const res = window.Android?.connectPrinter?.(id);
    if (res === "ok" || res === undefined) return { ok: true };
    return { ok: false, message: String(res) };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Connection failed" };
  }
}

export function disconnectPrinter(): void {
  try { window.Android?.disconnectPrinter?.(); } catch (e) { console.error(e); }
}

export function getConnectedPrinter(): BluetoothPrinterDevice | null {
  try {
    const raw = window.Android?.getConnectedPrinter?.();
    return safeParse<BluetoothPrinterDevice | null>(raw, null);
  } catch { return null; }
}

export function getSavedPrinter(): BluetoothPrinterDevice | null {
  return safeParse<BluetoothPrinterDevice | null>(localStorage.getItem(STORAGE_DEVICE), null);
}

export function setSavedPrinter(d: BluetoothPrinterDevice | null): void {
  if (!d) localStorage.removeItem(STORAGE_DEVICE);
  else localStorage.setItem(STORAGE_DEVICE, JSON.stringify({ id: d.id, name: d.name }));
}

/**
 * Ensure the saved printer is connected before sending a receipt.
 * No-op when the Android bridge is unavailable. Silent on success.
 */
export function ensurePrinterConnected(): { ok: boolean; message?: string } {
  if (!hasPrinterBridge()) return { ok: true };
  const current = getConnectedPrinter();
  if (current) return { ok: true };
  const saved = getSavedPrinter();
  if (!saved) return { ok: false, message: "No printer saved" };
  return connectPrinter(saved.id);
}

