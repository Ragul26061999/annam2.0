import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Receipt, Package, ShoppingCart, RotateCcw,
  RefreshCw, Archive, FileText, Building2, AlertTriangle,
  DollarSign, BarChart2, TrendingUp, Settings, Pill, Truck,
  CheckSquare, Upload, Bell, ChevronDown, Wifi, WifiOff, Activity,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

/* ── Nav structure ───────────────────────────────────────────────────────── */
const navGroups = [
  {
    label: "Operations",
    icon: Activity,
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/billing", icon: Receipt, label: "Billing" },
      { to: "/billing/new", icon: Receipt, label: "New Bill" },
      { to: "/inventory", icon: Package, label: "Inventory" },
      { to: "/prescribed", icon: FileText, label: "Prescribed" },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingCart,
    items: [
      { to: "/purchase", icon: ShoppingCart, label: "Drug Purchase" },
      { to: "/purchase/new", icon: ShoppingCart, label: "New Purchase" },
      { to: "/purchase-return", icon: RotateCcw, label: "Purchase Return" },
    ],
  },
  {
    label: "Returns & Issues",
    icon: RefreshCw,
    items: [
      { to: "/sales-return", icon: RefreshCw, label: "Sales Return" },
      { to: "/department-issue", icon: Building2, label: "Dept. Issue" },
      { to: "/drug-broken", icon: AlertTriangle, label: "Drug Broken" },
      { to: "/intent", icon: Archive, label: "Medicine Intent" },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    items: [
      { to: "/cash-collection", icon: DollarSign, label: "Cash Collection" },
      { to: "/reports", icon: BarChart2, label: "Reports" },
      { to: "/collection-report", icon: TrendingUp, label: "Collection Report" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { to: "/settings/suppliers", icon: Truck, label: "Suppliers" },
      { to: "/settings/medications", icon: Pill, label: "Edit Medications" },
      { to: "/settings/upload-medications", icon: Upload, label: "Upload Medications" },
      { to: "/settings/upload-batches", icon: Upload, label: "Upload Batches" },
      { to: "/settings/bulk-upload", icon: Upload, label: "Bulk Excel Upload" },
      { to: "/settings/batch-validation", icon: CheckSquare, label: "Batch Validation" },
      { to: "/settings/printing", icon: Printer, label: "Printer Settings" },
    ],
  },
];

const pageTitle: Record<string, string> = {
  "/": "Dashboard", "/billing": "Billing", "/billing/new": "New Bill",
  "/inventory": "Inventory", "/prescribed": "Prescribed",
  "/purchase": "Drug Purchase", "/purchase/new": "New Purchase",
  "/purchase-return": "Purchase Return", "/sales-return": "Sales Return",
  "/department-issue": "Department Issue", "/drug-broken": "Drug Broken",
  "/intent": "Medicine Intent", "/cash-collection": "Cash Collection",
  "/reports": "Reports", "/collection-report": "Collection Report",
  "/settings/suppliers": "Suppliers", "/settings/medications": "Edit Medications",
  "/settings/upload-medications": "Upload Medications",
  "/settings/upload-batches": "Upload Batches",
  "/settings/bulk-upload": "Bulk Excel Upload",
  "/settings/batch-validation": "Batch Validation",
  "/settings/printing": "Printer Settings",
};

export type SyncStatus = "synced" | "syncing" | "offline";

interface TopbarProps {
  syncStatus?: SyncStatus;
  onRefresh?: () => void;
}

type NavItem = { to: string; icon: React.ElementType; label: string; end?: boolean };
type NavGroupDef = { label: string; icon: React.ElementType; items: NavItem[] };

/* ── Portal dropdown (escapes overflow clipping) ─────────────────────────── */
function DropdownPortal({
  anchorRect,
  group,
  onClose,
}: {
  anchorRect: DOMRect;
  group: NavGroupDef;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down, true);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: anchorRect.bottom + 6, left: anchorRect.left, minWidth: 216 }}
      className="fixed z-[9999] rounded-2xl border border-orange-100 bg-white shadow-2xl shadow-orange-900/10 py-2 animate-slide-down overflow-hidden"
    >
      {/* Group header */}
      <div className="px-4 pt-1 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
          {group.label}
        </span>
      </div>
      {/* Separator */}
      <div className="mx-3 mb-1.5 h-px bg-orange-50" />
      {group.items.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 px-4 py-2.5 mx-1.5 rounded-xl text-sm font-medium",
              "transition-all duration-150 cursor-pointer",
              isActive
                ? "bg-gradient-to-r from-orange-50 to-orange-100/70 text-orange-700 shadow-sm"
                : "text-gray-600 hover:bg-orange-50/80 hover:text-orange-700"
            )
          }
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>,
    document.body
  );
}

/* ── Nav group button ────────────────────────────────────────────────────── */
function NavGroupButton({ group, location }: { group: NavGroupDef; location: string }) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isActive = group.items.some((item) =>
    item.to === "/" ? location === "/" : location.startsWith(item.to)
  );

  const toggle = useCallback(() => {
    if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
    setOpen((v) => !v);
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
          "transition-all duration-200 select-none whitespace-nowrap",
          isActive
            ? "bg-white/20 text-white shadow-inner"
            : "text-orange-100/80 hover:bg-white/10 hover:text-white"
        )}
      >
        <group.icon className="h-3.5 w-3.5 shrink-0" />
        <span>{group.label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && anchorRect && (
        <DropdownPortal anchorRect={anchorRect} group={group} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/* ── Main Topbar ─────────────────────────────────────────────────────────── */
export function Topbar({ syncStatus = "synced", onRefresh }: TopbarProps) {
  const location = useLocation();
  const currentTitle = pageTitle[location.pathname] ?? "Pharmacy";
  const today = formatDate(new Date().toISOString());

  const groupLabel = navGroups.find((g) =>
    g.items.some((i) => (i.to === "/" ? location.pathname === "/" : location.pathname.startsWith(i.to)))
  )?.label ?? "";

  const syncLabel = syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing…" : "Offline";

  return (
    <header className="flex flex-col w-full shrink-0" style={{ zIndex: 40 }}>

      {/* ── Brand strip — orange gradient matching web app ─────────────── */}
      <div className="flex h-13 items-center gap-1 px-4"
        style={{ background: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)" }}
      >
        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5 mr-3 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-md backdrop-blur-sm overflow-hidden">
            <img
              src="/logo/annamHospital-bg.png"
              alt="Annam"
              className="h-7 w-7 object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                img.parentElement!.innerHTML = '<span class="text-white font-bold text-sm">A</span>';
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight tracking-tight drop-shadow-sm">
              Annam Healthcare
            </span>
            <span className="text-[10px] text-orange-100/80 leading-tight font-medium">
              Pharmacy Desktop
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/25 mx-3 shrink-0" />

        {/* Nav groups */}
        <nav className="flex items-center gap-0.5 flex-1">
          {navGroups.map((group) => (
            <NavGroupButton key={group.label} group={group} location={location.pathname} />
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Sync pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/20 border border-white/20 backdrop-blur-sm px-3 py-1 text-xs">
            {syncStatus === "offline"
              ? <WifiOff className="h-3 w-3 text-red-200" />
              : <Wifi className="h-3 w-3 text-green-200" />
            }
            <span className={cn(
              "font-medium",
              syncStatus === "synced" && "text-green-200",
              syncStatus === "syncing" && "text-yellow-200",
              syncStatus === "offline" && "text-red-200",
            )}>
              {syncLabel}
            </span>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh from cloud"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 border border-white/20 text-white transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncStatus === "syncing" && "animate-spin")} />
          </button>

          <button
            title="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 border border-white/20 text-white transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-md" />
          </button>
        </div>
      </div>

      {/* ── Page breadcrumb sub-bar ───────────────────────────────────── */}
      <div className="flex h-8 items-center justify-between border-b border-orange-100 bg-orange-50/60 px-5">
        <div className="flex items-center gap-2">
          {groupLabel && (
            <>
              <span className="text-xs text-orange-400 font-medium">{groupLabel}</span>
              <span className="text-orange-300">›</span>
            </>
          )}
          <span className="text-xs font-semibold text-orange-700">{currentTitle}</span>
        </div>
        <span className="text-[11px] text-orange-400">{today}</span>
      </div>
    </header>
  );
}
