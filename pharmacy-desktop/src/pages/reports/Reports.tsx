import { useState, useEffect, useCallback } from "react";
import { RefreshCw, BarChart2, Download, TrendingUp, Package, DollarSign } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#0ea5e9", "#14b8a6", "#22c55e", "#f97316", "#ef4444", "#8b5cf6"];

type ReportTab = "sales" | "products" | "gst" | "outstanding";

export function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  // Sales report data
  const [salesData, setSalesData] = useState<{ name: string; sales: number; bills: number }[]>([]);
  const [salesSummary, setSalesSummary] = useState({
    totalSales: 0, totalBills: 0, cashSales: 0, cardSales: 0, upiSales: 0, pendingAmount: 0,
  });
  const [paymentBreakdown, setPaymentBreakdown] = useState<{ name: string; value: number }[]>([]);

  // Product report data
  const [topMedicines, setTopMedicines] = useState<{ name: string; quantity: number; revenue: number }[]>([]);

  // GST data
  const [gstSummary, setGstSummary] = useState({ cgst: 0, sgst: 0, igst: 0, total: 0 });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "sales") {
        const { data: bills } = await supabase
          .from("billing")
          .select("total_amount, amount_paid, payment_method, payment_status, created_at")
          .gte("created_at", dateFrom + "T00:00:00")
          .lte("created_at", dateTo + "T23:59:59");

        if (bills) {
          // Daily aggregation
          const byDay: Record<string, { sales: number; bills: number }> = {};
          for (const b of bills) {
            const day = b.created_at.slice(0, 10);
            if (!byDay[day]) byDay[day] = { sales: 0, bills: 0 };
            byDay[day].sales += b.total_amount || 0;
            byDay[day].bills += 1;
          }
          setSalesData(
            Object.entries(byDay)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, d]) => ({ name: formatDate(day), ...d }))
          );

          const cash = bills.filter((b) => b.payment_method === "cash").reduce((s, b) => s + (b.total_amount || 0), 0);
          const card = bills.filter((b) => b.payment_method === "card").reduce((s, b) => s + (b.total_amount || 0), 0);
          const upi = bills.filter((b) => b.payment_method === "upi").reduce((s, b) => s + (b.total_amount || 0), 0);
          const pending = bills.filter((b) => b.payment_status !== "paid").reduce((s, b) => s + ((b.total_amount || 0) - (b.amount_paid || 0)), 0);

          setSalesSummary({
            totalSales: bills.reduce((s, b) => s + (b.total_amount || 0), 0),
            totalBills: bills.length,
            cashSales: cash,
            cardSales: card,
            upiSales: upi,
            pendingAmount: pending,
          });

          setPaymentBreakdown([
            { name: "Cash", value: cash },
            { name: "Card", value: card },
            { name: "UPI", value: upi },
            { name: "Insurance", value: bills.filter((b) => b.payment_method === "insurance").reduce((s, b) => s + (b.total_amount || 0), 0) },
            { name: "Credit", value: bills.filter((b) => b.payment_method === "credit").reduce((s, b) => s + (b.total_amount || 0), 0) },
          ].filter((p) => p.value > 0));
        }
      }

      if (activeTab === "products") {
        const { data: items } = await supabase
          .from("billing_items")
          .select("medication_id, quantity, total_price, medication:medications(name)")
          .gte("created_at", dateFrom + "T00:00:00")
          .lte("created_at", dateTo + "T23:59:59");

        if (items) {
          const byMed: Record<string, { name: string; quantity: number; revenue: number }> = {};
          for (const item of items) {
            const name = (item.medication as any)?.name ?? item.medication_id;
            if (!byMed[item.medication_id]) byMed[item.medication_id] = { name, quantity: 0, revenue: 0 };
            byMed[item.medication_id].quantity += item.quantity || 0;
            byMed[item.medication_id].revenue += item.total_price || 0;
          }
          setTopMedicines(
            Object.values(byMed).sort((a, b) => b.revenue - a.revenue).slice(0, 15)
          );
        }
      }

      if (activeTab === "gst") {
        const { data: bills } = await supabase
          .from("billing")
          .select("cgst_amount, sgst_amount, igst_amount, tax_amount")
          .gte("created_at", dateFrom + "T00:00:00")
          .lte("created_at", dateTo + "T23:59:59");

        if (bills) {
          const cgst = bills.reduce((s, b) => s + (b.cgst_amount || 0), 0);
          const sgst = bills.reduce((s, b) => s + (b.sgst_amount || 0), 0);
          const igst = bills.reduce((s, b) => s + (b.igst_amount || 0), 0);
          setGstSummary({ cgst, sgst, igst, total: cgst + sgst + igst });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const exportToCSV = () => {
    if (activeTab === "sales") {
      const rows = [
        ["Date", "Sales", "Bills"],
        ...salesData.map((r) => [r.name, r.sales.toFixed(2), r.bills]),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${dateFrom}-to-${dateTo}.csv`;
      a.click();
    }
  };

  const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: "sales", label: "Sales Report", icon: TrendingUp },
    { key: "products", label: "Product Analytics", icon: Package },
    { key: "gst", label: "GST Report", icon: DollarSign },
    { key: "outstanding", label: "Outstanding", icon: BarChart2 },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Bar + Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border bg-gray-50 p-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === key
                      ? "bg-white text-primary-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
              <span className="text-gray-400">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
              <Button onClick={loadReports} variant="ghost" size="icon">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Report */}
      {activeTab === "sales" && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Sales", value: formatCurrency(salesSummary.totalSales), color: "text-primary-600" },
              { label: "Total Bills", value: salesSummary.totalBills, color: "text-gray-800" },
              { label: "Pending Amount", value: formatCurrency(salesSummary.pendingAmount), color: "text-danger-600" },
              { label: "Cash Sales", value: formatCurrency(salesSummary.cashSales), color: "text-success-600" },
              { label: "Card Sales", value: formatCurrency(salesSummary.cardSales), color: "text-medical-600" },
              { label: "UPI Sales", value: formatCurrency(salesSummary.upiSales), color: "text-warning-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader><CardTitle>Daily Sales</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Payment Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={paymentBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend iconSize={10} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Product Analytics */}
      {activeTab === "products" && (
        <Card>
          <CardHeader><CardTitle>Top Medicines by Revenue</CardTitle></CardHeader>
          <CardContent>
            {topMedicines.length === 0 ? (
              <p className="py-8 text-center text-gray-400">No data for selected period</p>
            ) : (
              <div className="space-y-2">
                {topMedicines.map((med, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-5 text-xs text-gray-400">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium">{med.name}</span>
                    <span className="w-20 text-right text-sm text-gray-500">Qty: {med.quantity}</span>
                    <span className="w-28 text-right text-sm font-semibold text-primary-600">{formatCurrency(med.revenue)}</span>
                    <div className="w-32 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-primary-500"
                        style={{ width: `${Math.min(100, (med.revenue / (topMedicines[0]?.revenue || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GST Report */}
      {activeTab === "gst" && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>GST Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "CGST (9%)", value: gstSummary.cgst },
                { label: "SGST (9%)", value: gstSummary.sgst },
                { label: "IGST (18%)", value: gstSummary.igst },
                { label: "Total GST", value: gstSummary.total },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="font-semibold">{formatCurrency(row.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>GST Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "CGST", value: gstSummary.cgst },
                      { name: "SGST", value: gstSummary.sgst },
                      { name: "IGST", value: gstSummary.igst },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  >
                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outstanding */}
      {activeTab === "outstanding" && (
        <OutstandingReport dateFrom={dateFrom} dateTo={dateTo} />
      )}
    </div>
  );
}

function OutstandingReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("billing")
      .select("bill_number, patient_name, customer_name, total_amount, amount_paid, payment_status, created_at")
      .neq("payment_status", "paid")
      .gte("created_at", dateFrom + "T00:00:00")
      .lte("created_at", dateTo + "T23:59:59")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setBills(data ?? []); setLoading(false); });
  }, [dateFrom, dateTo]);

  const totalOutstanding = bills.reduce((s, b) => s + ((b.total_amount || 0) - (b.amount_paid || 0)), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Outstanding Payments</CardTitle>
          <span className="text-xl font-bold text-danger-600">{formatCurrency(totalOutstanding)}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Loading...</p>
        ) : bills.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No outstanding payments</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Bill No.</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.bill_number} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{b.bill_number}</td>
                  <td className="px-4 py-2">{b.patient_name || b.customer_name || "—"}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(b.total_amount)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(b.amount_paid)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-danger-600">{formatCurrency((b.total_amount || 0) - (b.amount_paid || 0))}</td>
                  <td className="px-4 py-2">{formatDate(b.created_at)}</td>
                  <td className="px-4 py-2 capitalize">{b.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
