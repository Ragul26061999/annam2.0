import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, Download } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#0ea5e9", "#14b8a6", "#22c55e", "#f97316", "#ef4444"];

export function CollectionReport() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [paymentTrend, setPaymentTrend] = useState<any[]>([]);
  const [shiftBreakdown, setShiftBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [summary, setSummary] = useState({
    totalCash: 0, totalCard: 0, totalUpi: 0, totalInsurance: 0, totalCredit: 0,
    grandTotal: 0, totalBills: 0, totalReturns: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("pharmacy_cash_collections")
        .select("*")
        .gte("collection_date", dateFrom)
        .lte("collection_date", dateTo)
        .order("collection_date");

      if (data) {
        setCollections(data);

        const totals = data.reduce(
          (acc, c) => ({
            totalCash: acc.totalCash + (c.cash_sales || 0),
            totalCard: acc.totalCard + (c.card_collections || 0),
            totalUpi: acc.totalUpi + (c.upi_collections || 0),
            totalInsurance: acc.totalInsurance + (c.insurance_collections || 0),
            totalCredit: acc.totalCredit + (c.credit_collections || 0),
            grandTotal: acc.grandTotal + (c.total_collections || 0),
            totalBills: acc.totalBills + (c.total_bills || 0),
            totalReturns: acc.totalReturns + (c.total_returns || 0),
          }),
          { totalCash: 0, totalCard: 0, totalUpi: 0, totalInsurance: 0, totalCredit: 0, grandTotal: 0, totalBills: 0, totalReturns: 0 }
        );
        setSummary(totals);

        // Daily payment trend
        const byDay: Record<string, { date: string; cash: number; card: number; upi: number }> = {};
        for (const c of data) {
          const d = c.collection_date;
          if (!byDay[d]) byDay[d] = { date: d, cash: 0, card: 0, upi: 0 };
          byDay[d].cash += c.cash_sales || 0;
          byDay[d].card += c.card_collections || 0;
          byDay[d].upi += c.upi_collections || 0;
        }
        setPaymentTrend(Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)));

        // Shift breakdown
        const byShift: Record<string, number> = {};
        for (const c of data) {
          const s = c.shift || "general";
          byShift[s] = (byShift[s] || 0) + (c.total_collections || 0);
        }
        setShiftBreakdown(Object.entries(byShift).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const rows = [
      ["Collection No.", "Date", "Shift", "Collector", "Cash Sales", "Card", "UPI", "Insurance", "Total", "Status"],
      ...collections.map((c) => [
        c.collection_number, c.collection_date, c.shift, c.collector_name,
        c.cash_sales, c.card_collections, c.upi_collections, c.insurance_collections,
        c.total_collections, c.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collection-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
            <span className="text-gray-400">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Grand Total", value: summary.grandTotal, color: "text-primary-600" },
          { label: "Cash", value: summary.totalCash, color: "text-success-600" },
          { label: "Card", value: summary.totalCard, color: "text-medical-600" },
          { label: "UPI", value: summary.totalUpi, color: "text-warning-600" },
          { label: "Insurance", value: summary.totalInsurance, color: "text-hospital-600" },
          { label: "Credit", value: summary.totalCredit, color: "text-danger-600" },
          { label: "Total Bills", value: summary.totalBills, color: "text-gray-800" },
          { label: "Total Returns", value: summary.totalReturns, color: "text-danger-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>
                {typeof s.value === "number" && s.label.includes("Bills") || s.label.includes("Returns")
                  ? s.value
                  : formatCurrency(s.value as number)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle>Daily Collection Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={paymentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="cash" fill="#22c55e" name="Cash" stackId="a" />
                <Bar dataKey="card" fill="#0ea5e9" name="Card" stackId="a" />
                <Bar dataKey="upi" fill="#f97316" name="UPI" stackId="a" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Shift</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={shiftBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {shiftBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary-500" /> Collection Records ({collections.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {["Collection No.", "Date", "Shift", "Collector", "Cash Sales", "Card", "UPI", "Insurance", "Total", "Expected", "Actual", "Diff", "Status"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collections.length === 0 ? (
                  <tr><td colSpan={13} className="py-8 text-center text-gray-400">No collections in selected period</td></tr>
                ) : collections.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{c.collection_number}</td>
                    <td className="px-3 py-2">{c.collection_date}</td>
                    <td className="px-3 py-2 capitalize">{c.shift}</td>
                    <td className="px-3 py-2">{c.collector_name}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(c.cash_sales)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(c.card_collections)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(c.upi_collections)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(c.insurance_collections)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(c.total_collections)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(c.expected_cash)}</td>
                    <td className="px-3 py-2 text-right">{c.actual_cash != null ? formatCurrency(c.actual_cash) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${(c.cash_difference || 0) < 0 ? "text-danger-600" : "text-success-600"}`}>
                      {c.cash_difference != null ? formatCurrency(c.cash_difference) : "—"}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "open" ? "bg-success-100 text-success-700" : c.status === "discrepancy" ? "bg-danger-100 text-danger-700" : "bg-gray-100 text-gray-600"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
