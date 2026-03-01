import { useLocation } from "react-router-dom";
import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const pageTitle: Record<string, string> = {
  "/": "Dashboard",
  "/billing": "Billing",
  "/billing/new": "New Bill",
  "/inventory": "Inventory",
  "/prescribed": "Prescribed",
  "/purchase": "Drug Purchase",
  "/purchase/new": "New Purchase",
  "/purchase-return": "Purchase Return",
  "/sales-return": "Sales Return",
  "/department-issue": "Department Issue",
  "/drug-broken": "Drug Broken",
  "/intent": "Medicine Intent",
  "/cash-collection": "Cash Collection",
  "/reports": "Reports",
  "/collection-report": "Collection Report",
  "/settings/suppliers": "Suppliers",
  "/settings/medications": "Edit Medications",
  "/settings/upload-medications": "Upload Medications",
  "/settings/upload-batches": "Upload Batches",
  "/settings/bulk-upload": "Bulk Excel Upload",
  "/settings/batch-validation": "Batch Validation",
};

export function Header() {
  const location = useLocation();
  const title = pageTitle[location.pathname] ?? "Pharmacy";
  const today = formatDate(new Date().toISOString());

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-hospital-800">{title}</h1>
        <p className="text-xs text-hospital-500">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
