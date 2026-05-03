import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  iban?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth-scoped client so RPC sees auth.uid()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: WithdrawalRequest = await req.json();
    const { amount, bank_name, account_number, account_holder_name, iban } = body;

    if (!amount || typeof amount !== 'number' || amount < 100) {
      return new Response(JSON.stringify({ error: 'الحد الأدنى للسحب هو 100 ريال' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!bank_name || !account_number || !account_holder_name) {
      return new Response(JSON.stringify({ error: 'يرجى ملء جميع بيانات الحساب البنكي' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single atomic RPC call: validates balance, locks funds, creates request + tx + log + notification
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_amount: amount,
      p_bank_name: bank_name,
      p_account_holder_name: account_holder_name,
      p_account_number: account_number,
      p_iban: iban ?? null,
    });

    if (error) {
      console.error('[process-withdrawal] RPC error:', error);
      return new Response(JSON.stringify({ error: 'فشل في إنشاء طلب السحب' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data?.ok) {
      const messages: Record<string, string> = {
        not_authenticated: 'يجب تسجيل الدخول',
        amount_below_minimum: `الحد الأدنى للسحب هو ${data?.minimum ?? 100} ريال`,
        missing_bank_details: 'يرجى ملء جميع بيانات الحساب البنكي',
        wallet_not_found: 'لم يتم العثور على المحفظة',
        insufficient_balance: `المبلغ المتاح للسحب: ${data?.available ?? 0} ريال (محتجز: ${data?.reserve ?? 50} ريال)`,
      };
      return new Response(JSON.stringify({
        error: messages[data?.error] ?? 'فشل في إنشاء طلب السحب',
        details: data,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'تم استلام طلب السحب بنجاح',
      withdrawal_ref: data.reference,
      request_id: data.request_id,
      amount: data.amount,
      estimated_days: '2-5',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[process-withdrawal] Error:', error);
    return new Response(JSON.stringify({ error: 'حدث خطأ أثناء معالجة طلب السحب' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
