import { invoke } from "@tauri-apps/api/core";

export interface ReceiptLine {
  sn: number;
  name: string;
  qty: number;
  amt: number;
}

export interface ReceiptTextPayload {
  billNo: string;
  uhid: string;
  customerName: string;
  dateTime: string;
  salesType: string;
  taxableAmount: number;
  discount: number;
  cgst: number;
  sgst: number;
  total: number;
  paid: number;
  balance: number;
  printedOn: string;
  items: ReceiptLine[];
}

function padRight(s: string, n: number) {
  const str = String(s);
  return str.length >= n ? str.slice(0, n) : str + " ".repeat(n - str.length);
}

function padLeft(s: string, n: number) {
  const str = String(s);
  return str.length >= n ? str.slice(0, n) : " ".repeat(n - str.length) + str;
}

function center(s: string, width: number) {
  const str = String(s);
  if (str.length >= width) return str.slice(0, width);
  const left = Math.floor((width - str.length) / 2);
  const right = width - str.length - left;
  return " ".repeat(left) + str + " ".repeat(right);
}

function buildReceiptText(receipt: ReceiptTextPayload, paperWidthMm: number | null): string {
  // 85mm ~ 48 chars, 80mm ~ 42 chars, 58mm ~ 32 chars
  const width = paperWidthMm === 58 ? 32 : paperWidthMm === 80 ? 42 : 48;

  const sep = "-".repeat(width);

  const lines: string[] = [];
  lines.push(center("ANNAM PHARMACY", width));
  lines.push(center("2/301, Raj Kanna Nagar, Veerapandian Patanam", width));
  lines.push(center("Tiruchendur – 628216", width));
  lines.push(center("Phone- 04639 252592", width));
  lines.push(center("Gst No: 33AJWPR2713G2ZZ", width));
  lines.push(center("INVOICE", width));
  lines.push("");

  lines.push(`Bill No : ${receipt.billNo}`);
  lines.push(`UHID    : ${receipt.uhid}`);
  lines.push(`Name    : ${receipt.customerName}`);
  lines.push(`Date    : ${receipt.dateTime}`);
  lines.push(`Sales   : ${receipt.salesType}`);

  lines.push(sep);

  // Columns: SN (3) Name (width-3-4-8=width-15) Qty (4) Amt (8)
  const snW = 3;
  const qtyW = 4;
  const amtW = 8;
  const nameW = Math.max(width - snW - qtyW - amtW - 3, 10); // spaces between cols

  lines.push(
    `${padRight("No", snW)} ${padRight("Item", nameW)} ${padLeft("Qty", qtyW)} ${padLeft("Amt", amtW)}`
  );
  lines.push(sep);

  for (const it of receipt.items) {
    const name = it.name || "";
    const row = `${padRight(`${it.sn}.`, snW)} ${padRight(name, nameW)} ${padLeft(String(it.qty), qtyW)} ${padLeft(String(it.amt), amtW)}`;
    lines.push(row);
  }

  lines.push(sep);
  const kv = (k: string, v: string | number) => {
    const key = String(k);
    const val = String(v);
    const leftW = Math.max(width - val.length - 1, 1);
    return padRight(key, leftW) + " " + val;
  };

  lines.push(kv("Taxable Amount", receipt.taxableAmount));
  lines.push(kv("Dist Amt", receipt.discount));
  lines.push(kv("CGST Amt", receipt.cgst));
  lines.push(kv("SGST Amt", receipt.sgst));
  lines.push(kv("Total Amount", receipt.total));
  lines.push(kv("Paid", receipt.paid));
  lines.push(kv("Balance", receipt.balance));

  lines.push("");
  lines.push(kv("Printed on", receipt.printedOn));
  lines.push("");
  lines.push(center("Pharmacist Sign", width));
  lines.push("\n\n\n");

  return lines.join("\n");
}

export async function listPrinters(): Promise<string[]> {
  const printers = await invoke<string[]>("list_printers");
  return Array.isArray(printers) ? printers : [];
}

export async function printReceiptTextSilent(args: {
  printer: string | null;
  paperWidthMm: number | null;
  receipt: ReceiptTextPayload;
}): Promise<void> {
  const content = buildReceiptText(args.receipt, args.paperWidthMm);
  await invoke<void>("print_text", {
    printer: args.printer,
    paperWidthMm: args.paperWidthMm,
    content,
  });
}
