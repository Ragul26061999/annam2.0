export type PaperWidthMm = 58 | 80 | 85;

export interface PrintingSettings {
  printerName: string | null;
  paperWidthMm: PaperWidthMm;
}

const STORAGE_KEY = "annam_printing_settings_v1";

const DEFAULT_SETTINGS: PrintingSettings = {
  printerName: null,
  paperWidthMm: 85,
};

export function getPrintingSettings(): PrintingSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PrintingSettings>;

    const paperWidthMm =
      parsed.paperWidthMm === 58 || parsed.paperWidthMm === 80 || parsed.paperWidthMm === 85
        ? parsed.paperWidthMm
        : DEFAULT_SETTINGS.paperWidthMm;

    return {
      printerName: typeof parsed.printerName === "string" ? parsed.printerName : DEFAULT_SETTINGS.printerName,
      paperWidthMm,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setPrintingSettings(next: PrintingSettings): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
