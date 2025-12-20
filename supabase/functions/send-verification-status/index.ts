import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  status: 'approved' | 'rejected';
  reason?: string;
  userName?: string;
  userEmail?: string;
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

    const { userId, status, reason, userName, userEmail }: RequestBody = await req.json();

    console.log('Sending verification status:', { userId, status, userEmail });

    // Get user details if not provided
    let email = userEmail;
    let name = userName;
    
    if (!email || !name) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', userId)
        .single();
      
      email = profile?.email;
      name = profile?.full_name;
    }

    if (!email) {
      throw new Error('User email not found');
    }

    // Create notification in database
    const notificationTitle = status === 'approved' 
      ? 'تم الموافقة على حسابك' 
      : 'تم رفض طلب التحقق';
    
    const notificationMessage = status === 'approved'
      ? 'تم الموافقة على حسابك كمقدم خدمة. يمكنك الآن تسجيل الدخول والبدء في استخدام المنصة.'
      : `تم رفض طلب التحقق من حسابك كمقدم خدمة. ${reason ? `السبب: ${reason}` : 'يرجى التواصل مع الدعم للمزيد من المعلومات.'}`;

    await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        title: notificationTitle,
        message: notificationMessage,
        type: status === 'approved' ? 'verification_approved' : 'verification_rejected',
        read: false
      });

    // TODO: Send email using Resend or your email service
    // For now, we'll just log it
    console.log('Email would be sent to:', email);
    console.log('Subject:', notificationTitle);
    console.log('Body:', notificationMessage);

    // If you have RESEND_API_KEY configured, uncomment below:
    /*
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Adrena <noreply@yourdomain.com>',
          to: [email],
          subject: notificationTitle,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>${notificationTitle}</h2>
              <p>${notificationMessage}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه.
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send email:', await emailResponse.text());
      }
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification status notification sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
