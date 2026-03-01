import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { Topbar, SyncStatus } from "./Topbar";
import { supabase } from "@/lib/supabase";
import { cacheItems } from "@/lib/db";

export function Layout() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");

  const handleRefresh = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      // Background sync: medications + suppliers (most frequently needed)
      const [medsRes, suppRes] = await Promise.all([
        supabase
          .from("medications")
          .select(
            "id, medicine_code, name, generic_name, manufacturer, category, dosage_form, strength, unit, available_stock, minimum_stock_level, selling_price, mrp, status, updated_at"
          )
          .eq("status", "active")
          .limit(2000),
        supabase
          .from("suppliers")
          .select("id, supplier_code, name, phone, email, address, gst_number, status, updated_at")
          .limit(500),
      ]);

      if (medsRes.data) await cacheItems("medications", medsRes.data);
      if (suppRes.data) await cacheItems("suppliers", suppRes.data);

      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
      setTimeout(() => setSyncStatus("synced"), 5000);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-hospital-50">
      <Topbar syncStatus={syncStatus} onRefresh={handleRefresh} />
      <main className="flex-1 overflow-y-auto p-5">
        <Outlet />
      </main>
    </div>
  );
}
