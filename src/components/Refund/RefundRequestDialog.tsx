import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RefundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingType: "event" | "service";
  onSuccess?: () => void;
}

interface Eligibility {
  ok: boolean;
  total_amount?: number;
  eligible_pct?: number;
  eligible_amount?: number;
  days_until?: number;
  requires_manual?: boolean;
  error?: string;
}

export const RefundRequestDialog = ({
  open,
  onOpenChange,
  bookingId,
  bookingType,
  onSuccess,
}: RefundRequestDialogProps) => {
  const { t, isRTL } = useLanguageContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setEligibility(null);
    setReason("");
    loadEligibility();
  }, [open, bookingId]);

  const loadEligibility = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-refund", {
        body: { action: "estimate", booking_id: bookingId, booking_type: bookingType },
      });
      if (error) throw error;
      setEligibility(data?.result || data);
    } catch (e: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "تعذّر حساب الأهلية" : "Failed to estimate refund",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: isRTL ? "السبب مطلوب" : "Reason required",
        description: isRTL ? "يرجى ذكر سبب الاسترداد" : "Please provide a reason",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-refund", {
        body: {
          action: "request",
          booking_id: bookingId,
          booking_type: bookingType,
          reason: reason.trim(),
        },
      });
      if (error) throw error;
      const result = data?.result;
      if (result?.ok === false) {
        toast({
          title: isRTL ? "فشل الطلب" : "Request failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: isRTL ? "تم إرسال الطلب" : "Request submitted",
        description: result?.auto_processed
          ? isRTL ? "تم استرداد المبلغ تلقائياً" : "Refund processed automatically"
          : isRTL ? "طلبك قيد المراجعة" : "Your request is under review",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: e.message || (isRTL ? "حدث خطأ" : "An error occurred"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pct = eligibility?.eligible_pct ?? 0;
  const amount = eligibility?.eligible_amount ?? 0;
  const isManual = eligibility?.requires_manual || pct === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isRTL ? "rtl text-right" : ""}>
        <DialogHeader>
          <DialogTitle>{isRTL ? "طلب استرداد" : "Refund Request"}</DialogTitle>
          <DialogDescription>
            {isRTL
              ? "ستُحسب أهلية الاسترداد تلقائياً وفق سياسة المنصة"
              : "Refund eligibility is calculated automatically per policy"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : eligibility?.ok === false ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{eligibility.error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? "المبلغ الكلي" : "Total amount"}
                </span>
                <span className="font-semibold">
                  {eligibility?.total_amount?.toFixed(2)} {isRTL ? "ر.س" : "SAR"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? "نسبة الأهلية" : "Eligibility"}
                </span>
                <Badge variant={pct >= 100 ? "default" : pct > 0 ? "secondary" : "destructive"}>
                  {pct}%
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? "المبلغ المسترد" : "Refundable"}
                </span>
                <span className="font-bold text-primary">
                  {amount.toFixed(2)} {isRTL ? "ر.س" : "SAR"}
                </span>
              </div>
            </div>

            {isManual && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {isRTL
                    ? "هذا الطلب يحتاج موافقة الإدارة (خارج فترة الاسترداد التلقائي)"
                    : "This request needs admin approval (outside automatic window)"}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <label className="text-sm font-medium">
                {isRTL ? "سبب الاسترداد" : "Reason"}
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isRTL ? "اذكر السبب..." : "Provide a reason..."}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading || !eligibility?.ok}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isRTL ? "إرسال الطلب" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
