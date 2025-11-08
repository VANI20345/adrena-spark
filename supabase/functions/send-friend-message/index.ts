import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { receiver_id, message } = await req.json();

    if (!receiver_id || !message || message.trim() === '') {
      throw new Error('Missing receiver_id or message');
    }

    // Verify friendship exists
    const { data: friendship, error: friendshipError } = await supabaseClient
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${receiver_id}),and(user_id.eq.${receiver_id},friend_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (friendshipError || !friendship) {
      throw new Error('Not friends with this user');
    }

    // Insert message
    const { data: messageData, error: messageError } = await supabaseClient
      .from('friend_messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiver_id,
        message: message.trim()
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Get sender profile
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Create notification for receiver
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'friend_message',
        title: 'رسالة جديدة من صديق',
        message: `${senderProfile?.full_name || 'صديق'}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        data: {
          message_id: messageData.id,
          sender_id: user.id
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    console.log(`Message sent from ${user.id} to ${receiver_id}`);

    return new Response(
      JSON.stringify({ success: true, message: messageData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-friend-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});