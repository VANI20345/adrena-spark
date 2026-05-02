import { useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RefundRow {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  eligible_amount: number;
  eligible_pct: number;
  reason: string;
  status: string;
  refund_type: string;
  booking_type: string;
  failure_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  pending: "secondary",
  manual_review: "outline",
  processing: "secondary",
  rejected: "destructive",
  failed: "destructive",
};

export const RefundManagementTab = () => {
  const { isRTL } = useLanguageContext();
  const { toast } = useToast();
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideNote, setOverrideNote] = useState("");

  useEffect(() => {
    loadRefunds();
  }, []);

  const loadRefunds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("refunds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRefunds((data || []) as RefundRow[]);
    }
    setLoading(false);
  };

  const handleProcess = async (refund: RefundRow, override?: number) => {
    setProcessing(refund.id);
    try {
      const { data, error } = await supabase.functions.invoke("process-refund", {
        body: {
          action: "process",
          refund_id: refund.id,
          override_amount: override ?? null,
        },
      });
      if (error) throw error;
      const result = data?.result;
      if (result?.ok === false) {
        toast({
          title: isRTL ? "فشلت العملية" : "Processing failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: isRTL ? "تم التنفيذ" : "Processed",
          description: isRTL ? "تم تنفيذ الاسترداد" : "Refund processed",
        });
      }
      await loadRefunds();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(null);
      setOverrideOpen(false);
      setSelected(null);
      setOverrideAmount("");
      setOverrideNote("");
    }
  };

  const handleReject = async (refund: RefundRow) => {
    setProcessing(refund.id);
    const { error } = await supabase
      .from("refunds")
      .update({
        status: "rejected",
        failure_reason: "admin_rejected",
        processed_at: new Date().toISOString(),
      })
      .eq("id", refund.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isRTL ? "تم الرفض" : "Rejected" });
      await loadRefunds();
    }
    setProcessing(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{isRTL ? "إدارة الاستردادات" : "Refund Management"}</CardTitle>
            <CardDescription>
              {isRTL
                ? "مراجعة وموافقة طلبات الاسترداد اليدوية"
                : "Review and process manual refund requests"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadRefunds} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : refunds.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            {isRTL ? "لا توجد طلبات استرداد" : "No refund requests"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{isRTL ? "الأهلية" : "Eligibility"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "السبب" : "Reason"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="outline">{r.booking_type}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {Number(r.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{r.eligible_pct}%</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status] || "secondary"}>
                        {r.status}
                      </Badge>
                      {r.failure_reason && (
                        <div className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {r.failure_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.reason}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {["manual_review", "pending", "approved"].includes(r.status) && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={processing === r.id}
                            onClick={() => handleProcess(r)}
                          >
                            {processing === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(r);
                              setOverrideAmount(String(r.eligible_amount || r.amount));
                              setOverrideOpen(true);
                            }}
                          >
                            ✎
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={processing === r.id}
                            onClick={() => handleReject(r)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تعديل مبلغ الاسترداد" : "Override Refund Amount"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{isRTL ? "المبلغ" : "Amount"}</label>
              <Input
                type="number"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{isRTL ? "ملاحظة" : "Note"}</label>
              <Textarea value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => selected && handleProcess(selected, parseFloat(overrideAmount))}
              disabled={!overrideAmount || isNaN(parseFloat(overrideAmount))}
            >
              {isRTL ? "تأكيد" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
