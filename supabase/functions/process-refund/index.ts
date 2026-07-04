// Process Refund Edge Function — calls request_refund or process_refund RPCs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { raiseFinancialAlert } from "../_shared/alerts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "request");

    let rpcName: string;
    let rpcArgs: Record<string, unknown>;

    if (action === "request") {
      const { booking_id, booking_type, reason } = body;
      if (!booking_id || !booking_type) {
        return new Response(
          JSON.stringify({ error: "missing_fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rpcName = "request_refund";
      rpcArgs = {
        p_booking_id: booking_id,
        p_booking_type: booking_type,
        p_reason: reason || "user_request",
      };
    } else if (action === "process") {
      // Admin-driven: process an existing refund (manual_review flow)
      const { refund_id, override_amount } = body;
      if (!refund_id) {
        return new Response(
          JSON.stringify({ error: "missing_refund_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rpcName = "process_refund";
      rpcArgs = {
        p_refund_id: refund_id,
        p_admin_override_amount: override_amount ?? null,
      };
    } else if (action === "estimate") {
      const { booking_id, booking_type } = body;
      if (!booking_id || !booking_type) {
        return new Response(
          JSON.stringify({ error: "missing_fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rpcName = "calculate_refund_eligibility";
      rpcArgs = { p_booking_id: booking_id, p_booking_type: booking_type };
    } else {
      return new Response(JSON.stringify({ error: "invalid_action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc(rpcName, rpcArgs);

    if (error) {
      console.error(`[process-refund] RPC ${rpcName} error:`, error);
      await raiseFinancialAlert({
        component: rpcName,
        message: error.message || 'rpc_error',
        severity: 'critical',
        context: { source: 'process-refund', action, rpcArgs },
        reference_type: 'refund',
        reference_id: (rpcArgs as any).p_booking_id ?? (rpcArgs as any).p_refund_id ?? null,
      });
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, result: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[process-refund] fatal:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error).message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
