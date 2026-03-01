import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: "bg-success-100 text-success-700",
    inactive: "bg-gray-100 text-gray-600",
    discontinued: "bg-danger-100 text-danger-700",
    blacklisted: "bg-danger-100 text-danger-700",
    pending: "bg-warning-100 text-warning-700",
    paid: "bg-success-100 text-success-700",
    partial: "bg-primary-100 text-primary-700",
    refunded: "bg-gray-100 text-gray-600",
    draft: "bg-gray-100 text-gray-600",
    received: "bg-primary-100 text-primary-700",
    verified: "bg-success-100 text-success-700",
    cancelled: "bg-danger-100 text-danger-700",
    submitted: "bg-primary-100 text-primary-700",
    approved: "bg-medical-100 text-medical-700",
    completed: "bg-success-100 text-success-700",
    rejected: "bg-danger-100 text-danger-700",
    issued: "bg-success-100 text-success-700",
    returned: "bg-gray-100 text-gray-600",
    reported: "bg-warning-100 text-warning-700",
    disposed: "bg-gray-100 text-gray-600",
    claimed: "bg-primary-100 text-primary-700",
    open: "bg-success-100 text-success-700",
    closed: "bg-gray-100 text-gray-600",
    discrepancy: "bg-danger-100 text-danger-700",
    low_stock: "bg-warning-100 text-warning-700",
    expired: "bg-danger-100 text-danger-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
    return (
      ones[Math.floor(n / 100)] +
      " Hundred " +
      convertHundreds(n % 100)
    );
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = "";
  if (rupees > 0) {
    if (rupees >= 10000000)
      result +=
        convertHundreds(Math.floor(rupees / 10000000)) + "Crore ";
    if (rupees >= 100000)
      result +=
        convertHundreds(Math.floor((rupees % 10000000) / 100000)) + "Lakh ";
    if (rupees >= 1000)
      result +=
        convertHundreds(Math.floor((rupees % 100000) / 1000)) + "Thousand ";
    result += convertHundreds(rupees % 1000) + "Rupees";
  }
  if (paise > 0) {
    result += " and " + convertHundreds(paise) + "Paise";
  }
  return (result.trim() + " Only").replace(/\s+/g, " ");
}

export function generateBillNumber(prefix = "BILL"): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${rand}`;
}

export function isExpiringSoon(expiryDate: string, days = 90): boolean {
  const expiry = new Date(expiryDate);
  const future = new Date();
  future.setDate(future.getDate() + days);
  return expiry <= future && expiry > new Date();
}

export function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}
