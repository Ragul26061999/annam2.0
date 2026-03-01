import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { Supplier, Medication, DrugPurchaseItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LineItem extends Omit<DrugPurchaseItem, "medication_name"> {
  medication_name: string;
}

const defaultItem = (): LineItem => ({
  medication_id: "",
  medication_name: "",
  batch_number: "",
  expiry_date: "",
  quantity: 1,
  pack_counting: 1,
  free_quantity: 0,
  unit_price: 0,
  mrp: 0,
  discount_percent: 0,
  gst_percent: 12,
  cgst_percent: 6,
  sgst_percent: 6,
  igst_percent: 0,
  gst_amount: 0,
  total_amount: 0,
});

export function NewPurchase() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("credit");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<LineItem[]>([defaultItem()]);
  const [medSearch, setMedSearch] = useState<Record<number, string>>({});
  const [medResults, setMedResults] = useState<Record<number, any[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("suppliers")
      .select("*")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => setSuppliers(data ?? []));
  }, []);

  const searchMed = useCallback(async (idx: number, q: string) => {
    setMedSearch((prev) => ({ ...prev, [idx]: q }));
    if (q.length < 2) { setMedResults((prev) => ({ ...prev, [idx]: [] })); return; }
    const { data } = await supabase
      .from("medications")
      .select("id, name, generic_name, dosage_form, mrp, purchase_price, gst_percent, cgst_percent, sgst_percent")
      .ilike("name", `%${q}%`)
      .limit(8);
    setMedResults((prev) => ({ ...prev, [idx]: data ?? [] }));
  }, []);

  const selectMed = (idx: number, med: Medication) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i !== idx
          ? item
          : {
              ...item,
              medication_id: med.id,
              medication_name: med.name,
              unit_price: med.purchase_price || 0,
              mrp: med.mrp || 0,
              gst_percent: med.gst_percent || 12,
              cgst_percent: med.cgst_percent || 6,
              sgst_percent: med.sgst_percent || 6,
            }
      )
    );
    setMedSearch((prev) => ({ ...prev, [idx]: med.name }));
    setMedResults((prev) => ({ ...prev, [idx]: [] }));
  };

  const updateItem = (idx: number, field: string, val: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        // Recalculate totals
        const taxable =
          updated.quantity * updated.unit_price * (1 - updated.discount_percent / 100);
        updated.gst_amount = taxable * (updated.gst_percent / 100);
        updated.total_amount = taxable + updated.gst_amount;
        return updated;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, defaultItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const totalGst = items.reduce((s, i) => s + (i.gst_amount || 0), 0);
  const totalAmount = items.reduce((s, i) => s + (i.total_amount || 0), 0);

  const savePurchase = async () => {
    if (!supplierId) { alert("Select a supplier"); return; }
    if (items.some((i) => !i.medication_id)) { alert("Select medicine for all items"); return; }
    setSaving(true);
    try {
      const now = new Date();
      const purchaseNumber = `PUR-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;

      const { data: purchase, error } = await supabase
        .from("drug_purchases")
        .insert({
          purchase_number: purchaseNumber,
          supplier_id: supplierId,
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate || null,
          purchase_date: purchaseDate,
          subtotal,
          discount_amount: 0,
          cgst_amount: items.reduce((s, i) => s + (i.quantity * i.unit_price * i.cgst_percent) / 100, 0),
          sgst_amount: items.reduce((s, i) => s + (i.quantity * i.unit_price * i.sgst_percent) / 100, 0),
          igst_amount: 0,
          total_gst: totalGst,
          other_charges: 0,
          total_amount: totalAmount,
          payment_status: paymentStatus,
          payment_mode: paymentMode,
          paid_amount: paymentStatus === "paid" ? totalAmount : 0,
          status: "received",
          remarks: remarks || null,
        })
        .select()
        .single();

      if (error) throw error;

      const purchaseItems = items.map((item) => ({
        purchase_id: purchase.id,
        medication_id: item.medication_id,
        batch_number: item.batch_number,
        manufacturing_date: null,
        expiry_date: item.expiry_date,
        quantity: item.quantity,
        pack_counting: item.pack_counting,
        free_quantity: item.free_quantity,
        unit_price: item.unit_price,
        mrp: item.mrp,
        discount_percent: item.discount_percent,
        gst_percent: item.gst_percent,
        cgst_percent: item.cgst_percent,
        sgst_percent: item.sgst_percent,
        igst_percent: 0,
        gst_amount: item.gst_amount,
        total_amount: item.total_amount,
      }));

      await supabase.from("drug_purchase_items").insert(purchaseItems);

      alert(`Purchase ${purchaseNumber} created!`);
      navigate("/purchase");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchase")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">New Drug Purchase</h2>
      </div>

      {/* Purchase Header */}
      <Card>
        <CardHeader><CardTitle>Purchase Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Supplier *</label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="Select supplier">
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Invoice Number</label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Invoice Date</label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Purchase Date *</label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Payment Mode</label>
            <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="credit">Credit</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
              <option value="upi">UPI</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Payment Status</label>
            <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </Select>
          </div>
          <div className="col-span-3">
            <label className="mb-1 block text-sm font-medium">Remarks</label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any remarks..." />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Purchase Items</CardTitle>
            <Button onClick={addItem} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left">#</th>
                  <th className="px-3 py-3 text-left">Medicine</th>
                  <th className="px-3 py-3 text-left">Batch No.</th>
                  <th className="px-3 py-3 text-left">Expiry</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Free Qty</th>
                  <th className="px-3 py-3 text-right">Unit Price</th>
                  <th className="px-3 py-3 text-right">MRP</th>
                  <th className="px-3 py-3 text-right">Disc%</th>
                  <th className="px-3 py-3 text-right">GST%</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2" style={{ minWidth: 200 }}>
                      <div className="relative">
                        <Input
                          placeholder="Search medicine..."
                          value={medSearch[idx] ?? item.medication_name}
                          onChange={(e) => searchMed(idx, e.target.value)}
                          className="text-sm"
                        />
                        {(medResults[idx]?.length ?? 0) > 0 && (
                          <div className="absolute left-0 top-10 z-10 w-64 rounded-lg border bg-white shadow-lg">
                            {medResults[idx].map((m) => (
                              <button
                                key={m.id}
                                onClick={() => selectMed(idx, m)}
                                className="flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-gray-50"
                              >
                                <span className="font-medium">{m.name}</span>
                                <span className="text-gray-400">{m.generic_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input value={item.batch_number} onChange={(e) => updateItem(idx, "batch_number", e.target.value)} className="w-24 text-sm" placeholder="Batch" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="date" value={item.expiry_date} onChange={(e) => updateItem(idx, "expiry_date", e.target.value)} className="w-32 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="w-16 text-right text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" value={item.free_quantity} onChange={(e) => updateItem(idx, "free_quantity", parseInt(e.target.value) || 0)} className="w-16 text-right text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="w-20 text-right text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" value={item.mrp} onChange={(e) => updateItem(idx, "mrp", parseFloat(e.target.value) || 0)} className="w-20 text-right text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" value={item.discount_percent} onChange={(e) => updateItem(idx, "discount_percent", parseFloat(e.target.value) || 0)} className="w-16 text-right text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" value={item.gst_percent} onChange={(e) => updateItem(idx, "gst_percent", parseFloat(e.target.value) || 0)} className="w-16 text-right text-sm" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-danger-500" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary & Save */}
      <div className="flex items-end justify-between">
        <div className="space-y-1 rounded-lg border bg-white p-4 text-sm">
          <div className="flex justify-between gap-20">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total GST</span>
            <span className="font-medium">{formatCurrency(totalGst)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-base font-bold">
            <span>Total Amount</span>
            <span className="text-primary-600">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/purchase")}>Cancel</Button>
          <Button onClick={savePurchase} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Purchase"}
          </Button>
        </div>
      </div>
    </div>
  );
}
