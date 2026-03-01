import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { BillingList } from "@/pages/billing/BillingList";
import { NewBill } from "@/pages/billing/NewBill";
import { PurchaseList } from "@/pages/purchase/PurchaseList";
import { NewPurchase } from "@/pages/purchase/NewPurchase";
import { PurchaseReturn } from "@/pages/purchase-return/PurchaseReturn";
import { SalesReturn } from "@/pages/sales-return/SalesReturn";
import { Inventory } from "@/pages/inventory/Inventory";
import { Prescribed } from "@/pages/prescribed/Prescribed";
import { DepartmentIssue } from "@/pages/department-issue/DepartmentIssue";
import { DrugBroken } from "@/pages/drug-broken/DrugBroken";
import { Intent } from "@/pages/intent/Intent";
import { CashCollection } from "@/pages/cash-collection/CashCollection";
import { Reports } from "@/pages/reports/Reports";
import { CollectionReport } from "@/pages/collection-report/CollectionReport";
import { Suppliers } from "@/pages/settings/Suppliers";
import { EditMedication } from "@/pages/settings/EditMedication";
import { UploadMedications } from "@/pages/settings/UploadMedications";
import { UploadBatches } from "@/pages/settings/UploadBatches";
import { BulkUploadExcel } from "@/pages/settings/BulkUploadExcel";
import { BatchValidation } from "@/pages/settings/BatchValidation";
import { Printing } from "@/pages/settings/Printing";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "billing", element: <BillingList /> },
      { path: "billing/new", element: <NewBill /> },
      { path: "purchase", element: <PurchaseList /> },
      { path: "purchase/new", element: <NewPurchase /> },
      { path: "purchase-return", element: <PurchaseReturn /> },
      { path: "sales-return", element: <SalesReturn /> },
      { path: "inventory", element: <Inventory /> },
      { path: "prescribed", element: <Prescribed /> },
      { path: "department-issue", element: <DepartmentIssue /> },
      { path: "drug-broken", element: <DrugBroken /> },
      { path: "intent", element: <Intent /> },
      { path: "cash-collection", element: <CashCollection /> },
      { path: "reports", element: <Reports /> },
      { path: "collection-report", element: <CollectionReport /> },
      { path: "settings/suppliers", element: <Suppliers /> },
      { path: "settings/medications", element: <EditMedication /> },
      { path: "settings/upload-medications", element: <UploadMedications /> },
      { path: "settings/upload-batches", element: <UploadBatches /> },
      { path: "settings/bulk-upload", element: <BulkUploadExcel /> },
      { path: "settings/batch-validation", element: <BatchValidation /> },
      { path: "settings/printing", element: <Printing /> },
    ],
  },
]);
