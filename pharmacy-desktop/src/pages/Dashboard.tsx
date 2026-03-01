import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Package, AlertTriangle, ShoppingCart,
  Receipt, RefreshCw, DollarSign, Clock, Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getDashboardStats, cacheItems } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashStats {
  todaysSales: number;
  monthlyCollection: number;
  pendingBills: number;
  lowStockItems: number;
  expiringSoon: number;
  totalMedications: number;
  todaysBills: number;
  pendingPurchases: number;
}

interface SalesData { name: string; sales: number; bills: number; }

const COLORS = ["#0ea5e9", "#14b8a6", "#22c55e", "#f97316", "#ef4444"];

const EMPTY_STATS: DashStats = {
  todaysSales: 0, monthlyCollection: 0, pendingBills: 0, lowStockItems: 0,
  expiringSoon: 0, totalMedications: 0, todaysBills: 0, pendingPurchases: 0,
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashStats>(EMPTY_STATS);
  const [weeklySales, setWeeklySales] = useState<SalesData[]>([]);
  const [topMedicines, setTopMedicines] = useState<{ name: string; value: number }[]>([]);

  // loading = first paint with NO data at all yet
  const [loading, setLoading] = useState(true);
  // refreshing = background Supabase fetch in-progress (data already shown)
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<"cache" | "cloud" | null>(null);

  /* ── 1. Load local SQLite first ──────────────────────────────────────── */
  const loadFromCache = useCallback(async () => {
    const cached = await getDashboardStats();
    if (cached) {
      setStats((prev) => ({ ...prev, ...cached }));
      setSource("cache");
      setLoading(false);
    }
  }, []);

  /* ── 2. Refresh from Supabase in background ──────────────────────────── */
  const loadFromCloud = useCallback(async () => {
    setRefreshing(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(
        new Date().getFullYear(), new Date().getMonth(), 1
      ).toISOString().slice(0, 10);

      const [billsRes, medRes, expiryRes, purchaseRes, weeklyRes] = await Promise.all([
        supabase
          .from("billing")
          .select("id, total_amount, payment_status, created_at")
          .gte("created_at", monthStart + "T00:00:00"),
        supabase
          .from("medications")
          .select("id, available_stock, minimum_stock_level, status")
          .eq("status", "active"),
        supabase
          .from("stock_transactions")
          .select("id", { count: "exact", head: true })
          .lt("expiry_date", new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
          .gt("expiry_date", today)
          .eq("transaction_type", "purchase"),
        supabase
          .from("drug_purchases")
          .select("id", { count: "exact", head: true })
          .eq("payment_status", "pending"),
        supabase
          .from("billing")
          .select("total_amount, created_at")
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      const bills = billsRes.data ?? [];
      const meds = medRes.data ?? [];

      const todayBills = bills.filter((b) => b.created_at?.slice(0, 10) === today);
      const pendingBills = bills.filter((b) => b.payment_status === "pending");
      const lowStock = meds.filter((m) => m.available_stock < m.minimum_stock_level);

      setStats({
        todaysSales: todayBills.reduce((s, b) => s + (b.total_amount ?? 0), 0),
        todaysBills: todayBills.length,
        monthlyCollection: bills.reduce((s, b) => s + (b.total_amount ?? 0), 0),
        pendingBills: pendingBills.length,
        lowStockItems: lowStock.length,
        totalMedications: meds.length,
        expiringSoon: (expiryRes as any).count ?? 0,
        pendingPurchases: (purchaseRes as any).count ?? 0,
      });

      // Build weekly sales from real data
      const grouped: Record<string, number> = {};
      for (const b of weeklyRes.data ?? []) {
        const d = new Date(b.created_at).getDay();
        const day = DAYS[d === 0 ? 6 : d - 1];
        grouped[day] = (grouped[day] ?? 0) + (b.total_amount ?? 0);
      }
      setWeeklySales(DAYS.map((d) => ({ name: d, sales: grouped[d] ?? 0, bills: 0 })));

      // Cache bills for next offline session
      if (billsRes.data) await cacheItems("pharmacy_bills", billsRes.data);

      setSource("cloud");
    } catch (e) {
      console.error("Dashboard cloud load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Top medicines — static placeholder (replace with real aggregation query)
    setTopMedicines([
      { name: "Paracetamol", value: 420 },
      { name: "Amoxicillin", value: 310 },
      { name: "Metformin", value: 280 },
      { name: "Omeprazole", value: 240 },
      { name: "Others", value: 180 },
    ]);

    // local-first: cache first, then cloud
    loadFromCache().then(() => loadFromCloud());
  }, []);

  const handleRefresh = () => loadFromCloud();

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaysSales),
      subtitle: `${stats.todaysBills} bills today`,
      icon: TrendingUp,
      color: "text-primary-600",
      bgColor: "bg-primary-50",
    },
    {
      title: "Monthly Collection",
      value: formatCurrency(stats.monthlyCollection),
      subtitle: "This month",
      icon: DollarSign,
      color: "text-success-600",
      bgColor: "bg-success-50",
    },
    {
      title: "Pending Bills",
      value: stats.pendingBills,
      subtitle: "Awaiting payment",
      icon: Clock,
      color: "text-warning-600",
      bgColor: "bg-warning-50",
    },
    {
      title: "Low Stock",
      value: stats.lowStockItems,
      subtitle: "Below minimum",
      icon: Package,
      color: "text-danger-600",
      bgColor: "bg-danger-50",
    },
    {
      title: "Expiring Soon",
      value: stats.expiringSoon,
      subtitle: "Within 90 days",
      icon: AlertTriangle,
      color: "text-warning-600",
      bgColor: "bg-warning-50",
    },
    {
      title: "Total Medicines",
      value: stats.totalMedications,
      subtitle: "Active medications",
      icon: Activity,
      color: "text-medical-600",
      bgColor: "bg-medical-50",
    },
    {
      title: "Pending Purchases",
      value: stats.pendingPurchases,
      subtitle: "Awaiting payment",
      icon: ShoppingCart,
      color: "text-primary-600",
      bgColor: "bg-primary-50",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Quick actions + source indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {source && (
            <span className="text-[11px] text-hospital-400">
              {source === "cache" ? "Loaded from local cache" : "Live from cloud"}
              {refreshing && " · refreshing…"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/billing/new")} className="gap-2" size="sm">
            <Receipt className="h-3.5 w-3.5" /> New Bill
          </Button>
          <Button onClick={() => navigate("/purchase/new")} variant="outline" className="gap-2" size="sm">
            <ShoppingCart className="h-3.5 w-3.5" /> New Purchase
          </Button>
          <Button onClick={handleRefresh} variant="ghost" size="icon" disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats grid — shown even while loading (zeros first, then real data) */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.slice(0, 4).map((s) => (
          <StatCard key={s.title} card={s} shimmer={loading} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {statCards.slice(4).map((s) => (
          <StatCard key={s.title} card={s} shimmer={loading} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Weekly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Medicines</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={topMedicines}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={72}
                  dataKey="value"
                >
                  {topMedicines.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Stat card with shimmer skeleton ────────────────────────────────────── */
function StatCard({
  card,
  shimmer,
}: {
  card: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  };
  shimmer: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{card.title}</p>
            {shimmer ? (
              <div className="mt-1 h-7 w-24 animate-pulse rounded bg-gray-100" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-gray-800 tabular-nums">{card.value}</p>
            )}
            {card.subtitle && (
              <p className="mt-0.5 text-[11px] text-gray-400">{card.subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-2 ${card.bgColor} shrink-0 ml-2`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
