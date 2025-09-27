import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_ids: string[];
  title: string;
  message: string;
  type: string;
  data?: any;
  send_email?: boolean;
  send_sms?: boolean;
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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { 
      user_ids, 
      title, 
      message, 
      type, 
      data, 
      send_email = false, 
      send_sms = false 
    }: NotificationRequest = await req.json();

    // Create notifications for all users
    const notifications = user_ids.map(user_id => ({
      user_id,
      title,
      message,
      type,
      data,
      email_sent: false,
      sms_sent: false
    }));

    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (notificationError) throw notificationError;

    // Handle email notifications if requested
    if (send_email) {
      const { data: users } = await supabaseClient.auth.admin.listUsers();
      const emailUsers = users.users.filter(u => user_ids.includes(u.id));

      for (const emailUser of emailUsers) {
        // Check user's email notification preferences
        const { data: preferences } = await supabaseClient
          .from('notification_preferences')
          .select('email_notifications')
          .eq('user_id', emailUser.id)
          .single();

        if (preferences?.email_notifications) {
          // Here you would integrate with your email service
          // For now, we'll just log it
          console.log(`Would send email to ${emailUser.email}: ${title}`);
        }
      }
    }

    // Handle SMS notifications if requested
    if (send_sms) {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('user_id, phone')
        .in('user_id', user_ids);

      for (const profile of profiles || []) {
        if (profile.phone) {
          // Check user's SMS notification preferences
          const { data: preferences } = await supabaseClient
            .from('notification_preferences')
            .select('sms_notifications')
            .eq('user_id', profile.user_id)
            .single();

          if (preferences?.sms_notifications) {
            // Here you would integrate with your SMS service
            console.log(`Would send SMS to ${profile.phone}: ${title}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notifications_sent: user_ids.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Notification sending error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Failed to send notifications' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});