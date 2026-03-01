// Local SQLite database — offline-first support via Tauri SQL plugin
// Gracefully falls back to no-op when running in browser/dev mode

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;

async function getDb() {
  if (db) return db;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sql = await import("@tauri-apps/plugin-sql") as any;
    const Database = sql.Database ?? sql.default?.Database;
    if (!Database) return null;
    db = await Database.load("sqlite:pharmacy.db");
    await initSchema();
    return db;
  } catch (e) {
    console.warn("SQLite not available (browser/dev mode):", e);
    return null;
  }
}

async function initSchema() {
  if (!db) return;

  const tables = [
    `CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      medicine_code TEXT, medication_code TEXT,
      name TEXT NOT NULL, generic_name TEXT, combination TEXT,
      manufacturer TEXT, category TEXT, dosage_form TEXT,
      strength TEXT, unit TEXT, location TEXT,
      available_stock REAL DEFAULT 0, total_stock REAL DEFAULT 0,
      minimum_stock_level REAL DEFAULT 0,
      selling_price REAL DEFAULT 0, mrp REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      updated_at TEXT, synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS medicine_batches (
      id TEXT PRIMARY KEY,
      medicine_id TEXT NOT NULL,
      batch_number TEXT, batch_barcode TEXT, legacy_code TEXT,
      expiry_date TEXT, current_quantity REAL DEFAULT 0,
      purchase_price REAL DEFAULT 0, selling_price REAL DEFAULT 0,
      pack_size REAL, pack_purchase_price REAL, pack_mrp REAL,
      unit_purchase_price REAL,
      rack_location TEXT, status TEXT DEFAULT 'active',
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      name TEXT NOT NULL,
      phone TEXT, email TEXT,
      date_of_birth TEXT, gender TEXT, address TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS pharmacy_bills (
      id TEXT PRIMARY KEY,
      bill_number TEXT,
      customer_name TEXT, customer_type TEXT DEFAULT 'walk_in',
      patient_id TEXT, patient_uhid TEXT,
      subtotal REAL DEFAULT 0, discount REAL DEFAULT 0,
      tax REAL DEFAULT 0, total_amount REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'pending',
      staff_id TEXT, notes TEXT,
      created_at TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS billing_items (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      medicine_id TEXT, batch_id TEXT,
      medicine_name TEXT, batch_number TEXT,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      supplier_code TEXT, name TEXT NOT NULL,
      phone TEXT, email TEXT, address TEXT,
      gst_number TEXT, status TEXT DEFAULT 'active',
      updated_at TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS drug_purchases (
      id TEXT PRIMARY KEY,
      purchase_number TEXT, supplier_id TEXT, supplier_name TEXT,
      invoice_number TEXT, purchase_date TEXT,
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending',
      created_at TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS drug_purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      medication_id TEXT, medicine_name TEXT,
      batch_number TEXT, quantity REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0, total_cost REAL DEFAULT 0,
      expiry_date TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS stock_transactions (
      id TEXT PRIMARY KEY,
      medication_id TEXT, batch_number TEXT,
      transaction_type TEXT, quantity REAL DEFAULT 0,
      expiry_date TEXT, created_at TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      bill_id TEXT, return_number TEXT,
      return_date TEXT, refund_amount REAL DEFAULT 0,
      reason TEXT, status TEXT DEFAULT 'pending',
      created_at TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT UNIQUE,
      last_synced_at TEXT,
      record_count INTEGER DEFAULT 0
    )`,
  ];

  for (const sql of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.execute(sql).catch((e: any) => console.warn("Schema:", e?.message));
  }
}

/* ─── Generic cache helpers ──────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheItems(table: string, items: any[]) {
  const database = await getDb();
  if (!database || !items.length) return;
  try {
    for (const item of items) {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(item)) {
        if (typeof v !== "object" || v === null) sanitized[k] = v;
      }
      const cols = Object.keys(sanitized).join(", ");
      const placeholders = Object.keys(sanitized).map(() => "?").join(", ");
      if (!cols) continue;
      await database.execute(
        `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`,
        Object.values(sanitized)
      );
    }
    await database.execute(
      `INSERT OR REPLACE INTO sync_log (table_name, last_synced_at, record_count)
       VALUES (?, datetime('now'), ?)`,
      [table, items.length]
    );
  } catch (e) {
    console.warn(`cacheItems[${table}]:`, e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedItems(table: string, where?: string, params?: any[]): Promise<any[]> {
  const database = await getDb();
  if (!database) return [];
  try {
    const sql = where ? `SELECT * FROM ${table} WHERE ${where}` : `SELECT * FROM ${table}`;
    return await database.select(sql, params ?? []);
  } catch (e) {
    console.warn(`getCachedItems[${table}]:`, e);
    return [];
  }
}

export async function getLastSyncTime(table: string): Promise<string | null> {
  const database = await getDb();
  if (!database) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.select(
      `SELECT last_synced_at FROM sync_log WHERE table_name = ? LIMIT 1`, [table]
    ) as any[];
    return rows[0]?.last_synced_at ?? null;
  } catch { return null; }
}

/* ─── Typed query helpers ────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedMedications(): Promise<any[]> {
  const database = await getDb();
  if (!database) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meds = await database.select(`SELECT * FROM medications WHERE status = 'active' ORDER BY name`) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batches = await database.select(`SELECT * FROM medicine_batches WHERE status = 'active' ORDER BY expiry_date`) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byMed: Record<string, any[]> = {};
    for (const b of batches) {
      if (!byMed[b.medicine_id]) byMed[b.medicine_id] = [];
      byMed[b.medicine_id].push(b);
    }
    return meds.map((m) => ({ ...m, batches: byMed[m.id] ?? [] }));
  } catch { return []; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchCachedPatients(term: string): Promise<any[]> {
  const database = await getDb();
  if (!database || !term.trim()) return [];
  try {
    const q = `%${term.toLowerCase()}%`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await database.select(
      `SELECT * FROM patients WHERE lower(name) LIKE ? OR lower(patient_id) LIKE ? LIMIT 10`,
      [q, q]
    ) as any[];
  } catch { return []; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedBills(limit = 300): Promise<any[]> {
  const database = await getDb();
  if (!database) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await database.select(
      `SELECT * FROM pharmacy_bills ORDER BY created_at DESC LIMIT ?`, [limit]
    ) as any[];
  } catch { return []; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedSuppliers(): Promise<any[]> {
  return getCachedItems("suppliers");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedPurchases(limit = 200): Promise<any[]> {
  const database = await getDb();
  if (!database) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await database.select(
      `SELECT * FROM drug_purchases ORDER BY created_at DESC LIMIT ?`, [limit]
    ) as any[];
  } catch { return []; }
}

export async function getDashboardStats() {
  const database = await getDb();
  if (!database) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(
      new Date().getFullYear(), new Date().getMonth(), 1
    ).toISOString().slice(0, 10);

    const [todayBills, monthBills, lowStock, totalMeds, expiringSoon, pendingPurchases] =
      await Promise.all([
        database.select(
          `SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count
           FROM pharmacy_bills WHERE date(created_at) = ?`, [today]
        ),
        database.select(
          `SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count
           FROM pharmacy_bills WHERE date(created_at) >= ?`, [monthStart]
        ),
        database.select(
          `SELECT COUNT(*) as count FROM medications
           WHERE available_stock < minimum_stock_level AND status = 'active'`
        ),
        database.select(`SELECT COUNT(*) as count FROM medications WHERE status = 'active'`),
        database.select(
          `SELECT COUNT(*) as count FROM medicine_batches
           WHERE expiry_date BETWEEN ? AND date(?, '+90 days') AND status = 'active'`,
          [today, today]
        ),
        database.select(
          `SELECT COUNT(*) as count FROM drug_purchases WHERE payment_status = 'pending'`
        ),
      ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      todaysSales: (todayBills as any[])[0]?.total ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      todaysBills: (todayBills as any[])[0]?.count ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      monthlyCollection: (monthBills as any[])[0]?.total ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lowStockItems: (lowStock as any[])[0]?.count ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalMedications: (totalMeds as any[])[0]?.count ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiringSoon: (expiringSoon as any[])[0]?.count ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pendingPurchases: (pendingPurchases as any[])[0]?.count ?? 0,
    };
  } catch (e) {
    console.warn("getDashboardStats:", e);
    return null;
  }
}

export { getDb };
