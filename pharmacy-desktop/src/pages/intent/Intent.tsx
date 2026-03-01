import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Archive } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface IntentRecord {
  id: string;
  intent_number?: string;
  intent_type?: string;
  medication_id?: string;
  medication_name?: string;
  batch_number?: string;
  quantity?: number;
  from_location?: string;
  to_location?: string;
  status?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export function Intent() {
  const [intents, setIntents] = useState<IntentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("medicine_intents").select("*").order("created_at", { ascending: false });
      if (search) query = query.ilike("medication_name", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) setIntents(data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search medicine..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary-500" />
            Medicine Intents ({intents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intent No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : intents.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-8 text-center text-gray-400">No intents found</TableCell></TableRow>
              ) : intents.map((intent) => (
                <TableRow key={intent.id}>
                  <TableCell className="font-mono text-xs">{intent.intent_number ?? "—"}</TableCell>
                  <TableCell className="capitalize">{intent.intent_type ?? "—"}</TableCell>
                  <TableCell className="font-medium">{intent.medication_name ?? "—"}</TableCell>
                  <TableCell>{intent.batch_number ?? "—"}</TableCell>
                  <TableCell>{intent.quantity ?? "—"}</TableCell>
                  <TableCell>{intent.from_location ?? "—"}</TableCell>
                  <TableCell>{intent.to_location ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(intent.status ?? "")}`}>{intent.status ?? "—"}</span>
                  </TableCell>
                  <TableCell>{formatDate(intent.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
