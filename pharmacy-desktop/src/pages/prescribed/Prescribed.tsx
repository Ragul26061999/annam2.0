import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, FileText, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Prescription {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_uhid?: string;
  prescribed_by: string;
  prescribed_date: string;
  dispensed_date?: string;
  status: string;
  medications?: any[];
  total_amount?: number;
  payment_status?: string;
}

export function Prescribed() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("prescription_groups")
        .select("*, patient:patients(name, uhid)")
        .order("prescribed_date", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.ilike("prescribed_by", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) {
        setPrescriptions(
          data.map((d) => ({
            ...d,
            patient_name: (d.patient as any)?.name,
            patient_uhid: (d.patient as any)?.uhid,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function getStatusBadge(status: string) {
    const map: Record<string, "success" | "warning" | "info" | "destructive"> = {
      active: "success",
      partially_dispensed: "warning",
      dispensed: "info",
      expired: "destructive",
    };
    return <Badge variant={map[status] ?? "secondary"}>{status.replace("_", " ")}</Badge>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by doctor, patient..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="partially_dispensed">Partially Dispensed</option>
              <option value="dispensed">Dispensed</option>
              <option value="expired">Expired</option>
            </Select>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-500" />
            Prescriptions ({prescriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>UHID</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Prescribed Date</TableHead>
                <TableHead>Dispensed Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : prescriptions.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-gray-400">No prescriptions found</TableCell></TableRow>
              ) : prescriptions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.patient_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.patient_uhid ?? "—"}</TableCell>
                  <TableCell>{p.prescribed_by}</TableCell>
                  <TableCell>{formatDate(p.prescribed_date)}</TableCell>
                  <TableCell>{p.dispensed_date ? formatDate(p.dispensed_date) : "—"}</TableCell>
                  <TableCell>{getStatusBadge(p.status)}</TableCell>
                  <TableCell>
                    {p.payment_status ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${getStatusColor(p.payment_status)}`}>
                        {p.payment_status}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
