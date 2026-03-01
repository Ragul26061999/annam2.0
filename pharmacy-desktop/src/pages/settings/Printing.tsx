import { useEffect, useMemo, useState } from "react";
import { Printer, Save, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getPrintingSettings, setPrintingSettings, type PaperWidthMm } from "@/lib/printingSettings";
import { listPrinters } from "@/lib/tauriPrint";

export function Printing() {
  const initial = useMemo(() => getPrintingSettings(), []);
  const [printerName, setPrinterName] = useState<string>(initial.printerName ?? "");
  const [paperWidthMm, setPaperWidthMm] = useState<PaperWidthMm>(initial.paperWidthMm);

  const [printers, setPrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const refreshPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const names = await listPrinters();
      setPrinters(names);
    } catch {
      setPrinters([]);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    void refreshPrinters();
  }, []);

  const save = () => {
    setPrintingSettings({
      printerName: printerName.trim() ? printerName.trim() : null,
      paperWidthMm,
    });
    alert("Printing settings saved");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
          <Printer className="h-5 w-5 text-orange-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Printing</h1>
          <p className="text-sm text-gray-500">Set default printer and paper width for silent thermal printing</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Printer</CardTitle>
          <Button variant="outline" onClick={refreshPrinters} disabled={loadingPrinters}>
            <RefreshCw className={loadingPrinters ? "animate-spin" : ""} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Default Printer</label>
              <Select
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="Select printer"
                className="mt-1"
              >
                <option value="">System Default</option>
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-gray-500">
                If you keep this as System Default, macOS default printer will be used.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Paper Width</label>
              <Select
                value={String(paperWidthMm)}
                onChange={(e) => setPaperWidthMm(Number(e.target.value) as PaperWidthMm)}
                className="mt-1"
              >
                <option value="58">58 mm (Compact/Portable)</option>
                <option value="80">80 mm (Standard)</option>
                <option value="85">85 mm (Wide)</option>
              </Select>
              <p className="mt-1 text-xs text-gray-500">
                Choose based on your thermal printer model. Common sizes: 58 mm for compact/portable printers, 80 mm for standard receipt printers, 85 mm for wider models.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save}>
              <Save />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
