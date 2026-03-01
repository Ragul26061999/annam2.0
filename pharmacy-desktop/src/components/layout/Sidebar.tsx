import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Package,
  ShoppingCart,
  RotateCcw,
  RefreshCw,
  Archive,
  FileText,
  Building2,
  AlertTriangle,
  DollarSign,
  BarChart2,
  TrendingUp,
  Settings,
  Pill,
  Truck,
  CheckSquare,
  Upload,
  Users,
} from "lucide-react";

const navGroups = [
  {
    label: "Operations",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/billing", icon: Receipt, label: "Billing" },
      { to: "/inventory", icon: Package, label: "Inventory" },
      { to: "/prescribed", icon: FileText, label: "Prescribed" },
    ],
  },
  {
    label: "Purchases",
    items: [
      { to: "/purchase", icon: ShoppingCart, label: "Drug Purchase" },
      { to: "/purchase-return", icon: RotateCcw, label: "Purchase Return" },
    ],
  },
  {
    label: "Returns & Issues",
    items: [
      { to: "/sales-return", icon: RefreshCw, label: "Sales Return" },
      { to: "/department-issue", icon: Building2, label: "Dept. Issue" },
      { to: "/drug-broken", icon: AlertTriangle, label: "Drug Broken" },
      { to: "/intent", icon: Archive, label: "Intent" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/cash-collection", icon: DollarSign, label: "Cash Collection" },
      { to: "/reports", icon: BarChart2, label: "Reports" },
      { to: "/collection-report", icon: TrendingUp, label: "Collection Report" },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/settings/suppliers", icon: Truck, label: "Suppliers" },
      { to: "/settings/medications", icon: Pill, label: "Edit Medications" },
      { to: "/settings/upload-medications", icon: Upload, label: "Upload Medications" },
      { to: "/settings/upload-batches", icon: Upload, label: "Upload Batches" },
      { to: "/settings/bulk-upload", icon: Upload, label: "Bulk Excel Upload" },
      { to: "/settings/batch-validation", icon: CheckSquare, label: "Batch Validation" },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-hospital-900 text-white">
      {/* Logo / Header */}
      <div className="flex items-center gap-3 border-b border-hospital-700 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
          <Pill className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-white">Pharmacy</p>
          <p className="text-xs text-hospital-400">Desktop App</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-wider text-hospital-500">
              {group.label}
            </p>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-hospital-300 hover:bg-hospital-800 hover:text-white"
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-hospital-700 px-5 py-3">
        <p className="text-xs text-hospital-500">Annam Healthcare v0.1</p>
      </div>
    </aside>
  );
}
