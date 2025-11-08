import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  type: string;
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    metadata: {
      booking_id: string;
      user_id: string;
    };
  };
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    const { type, data } = payload;

    console.log('Webhook received:', { type, paymentId: data.id, status: data.status });

    if (type === 'payment_paid') {
      // Update payment status
      await supabaseClient
        .from('payments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('provider_payment_id', data.id);

      // Send confirmation notification
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: data.metadata.user_id,
          type: 'payment_success',
          title: 'تم الدفع بنجاح',
          message: `تم استلام دفعتك بقيمة ${data.amount / 100} ${data.currency}`,
          data: { 
            booking_id: data.metadata.booking_id,
            payment_id: data.id,
            amount: data.amount / 100
          }
        });

    } else if (type === 'payment_failed') {
      // Update payment and booking status
      await supabaseClient
        .from('payments')
        .update({ status: 'failed' })
        .eq('provider_payment_id', data.id);

      await supabaseClient
        .from('bookings')
        .update({ status: 'failed' })
        .eq('id', data.metadata.booking_id);

      // Send failure notification
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: data.metadata.user_id,
          type: 'payment_failed',
          title: 'فشل في الدفع',
          message: 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى.',
          data: { 
            booking_id: data.metadata.booking_id,
            payment_id: data.id
          }
        });
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Error', { status: 500 });
  }
});