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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const { amount, bank_name, account_number, account_holder_name, iban }: WithdrawalRequest = await req.json();

    // Validate input
    if (!amount || amount < 100) {
      return new Response(JSON.stringify({ error: 'الحد الأدنى للسحب هو 100 ريال' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!bank_name || !account_number || !account_holder_name) {
      return new Response(JSON.stringify({ error: 'يرجى ملء جميع بيانات الحساب البنكي' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'لم يتم العثور على المحفظة' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check available balance (keep 50 SAR minimum)
    const availableBalance = wallet.balance - 50;
    if (amount > availableBalance) {
      return new Response(JSON.stringify({ error: `المبلغ المتاح للسحب هو ${availableBalance} ريال فقط` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create withdrawal request
    const withdrawalRef = `WD-${Date.now()}-${userId.substring(0, 8)}`;

    // For now, we'll create a pending withdrawal request
    // In production, this would integrate with Moyasar's Transfer API
    // or a bank transfer service

    // Create wallet transaction for withdrawal (pending)
    const { data: transaction, error: txError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'withdraw',
        amount: -amount, // Negative for withdrawal
        description: `طلب سحب إلى ${bank_name} - ${account_number}`,
        status: 'pending',
        reference_id: withdrawalRef,
        reference_type: 'withdrawal'
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create withdrawal transaction:', txError);
      return new Response(JSON.stringify({ error: 'فشل في إنشاء طلب السحب' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update wallet balance (reserve the amount)
    const { error: updateError } = await supabaseClient
      .from('user_wallets')
      .update({
        balance: wallet.balance - amount,
        pending_earnings: (wallet.pending_earnings || 0) + amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      // Rollback transaction
      await supabaseClient.from('wallet_transactions').delete().eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'فشل في تحديث المحفظة' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log financial transaction
    await supabaseClient.from('financial_transaction_logs').insert({
      transaction_type: 'withdrawal',
      amount: amount,
      reference_type: 'withdrawal',
      reference_id: transaction.id,
      payer_id: null, // Platform pays
      receiver_id: userId,
      status: 'pending',
      metadata: {
        bank_name,
        account_number: account_number.slice(-4), // Only store last 4 digits for security
        account_holder_name,
        iban: iban ? iban.slice(-4) : null,
        withdrawal_ref: withdrawalRef
      }
    });

    // Send notification
    await supabaseClient.from('notifications').insert({
      user_id: userId,
      type: 'withdrawal_requested',
      title: 'تم استلام طلب السحب',
      message: `تم استلام طلب سحب ${amount} ريال وسيتم معالجته خلال 2-5 أيام عمل`,
      data: {
        amount,
        bank_name,
        withdrawal_ref: withdrawalRef,
        transaction_id: transaction.id
      }
    });

    // In production, you would integrate with Moyasar Transfer API here
    // const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');
    // const transferResponse = await fetch('https://api.moyasar.com/v1/transfers', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     amount: amount * 100, // Convert to halalas
    //     iban: iban,
    //     name: account_holder_name,
    //     description: `Withdrawal ${withdrawalRef}`
    //   })
    // });

    console.log('[process-withdrawal] Withdrawal request created:', {
      userId,
      amount,
      bank_name,
      withdrawalRef
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'تم استلام طلب السحب بنجاح',
      withdrawal_ref: withdrawalRef,
      transaction_id: transaction.id,
      estimated_days: '2-5'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-withdrawal] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'حدث خطأ أثناء معالجة طلب السحب'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
