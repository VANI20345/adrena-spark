// Shared helper to raise system_alerts when a financial RPC fails.
// Uses service role to bypass RLS. Never throws — alerting must not break callers further.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (_admin) return _admin;
  _admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  return _admin;
}

export interface RaiseAlertParams {
  component: string;            // e.g. "confirm_paid_booking"
  message: string;              // human-readable error
  context?: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | "critical";
  reference_type?: string;      // "event_booking" | "service_booking" | "withdrawal" | "refund"
  reference_id?: string;        // uuid
  amount?: number;
  payer_id?: string;
  receiver_id?: string;
}

export async function raiseFinancialAlert(p: RaiseAlertParams): Promise<void> {
  try {
    const { error } = await admin().rpc("raise_financial_alert", {
      p_component: p.component,
      p_message: p.message,
      p_context: p.context ?? {},
      p_severity: p.severity ?? "error",
      p_reference_type: p.reference_type ?? null,
      p_reference_id: p.reference_id ?? null,
      p_amount: p.amount ?? null,
      p_payer_id: p.payer_id ?? null,
      p_receiver_id: p.receiver_id ?? null,
    });
    if (error) console.error("[raiseFinancialAlert] rpc error:", error);
  } catch (e) {
    console.error("[raiseFinancialAlert] fatal:", e);
  }
}
