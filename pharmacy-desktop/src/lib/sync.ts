// Background sync: Supabase → local SQLite cache
import { supabase } from "./supabase";
import { cacheItems } from "./db";

let syncInterval: ReturnType<typeof setInterval> | null = null;

export async function syncMedications() {
  const { data, error } = await supabase
    .from("medications")
    .select("id, medicine_code, name, generic_name, manufacturer, category, dosage_form, strength, unit, available_stock, minimum_stock_level, selling_price, mrp, status, updated_at")
    .order("name");
  if (!error && data) {
    await cacheItems("medications", data);
  }
}

export async function syncSuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, supplier_code, name, phone, email, status, updated_at")
    .order("name");
  if (!error && data) {
    await cacheItems("suppliers", data);
  }
}

export async function startBackgroundSync(intervalMs = 5 * 60 * 1000) {
  // Initial sync
  await Promise.allSettled([syncMedications(), syncSuppliers()]);

  // Periodic sync
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    await Promise.allSettled([syncMedications(), syncSuppliers()]);
  }, intervalMs);
}

export function stopBackgroundSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
