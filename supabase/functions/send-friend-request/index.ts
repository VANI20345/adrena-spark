import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { receiver_id, message } = await req.json();

    if (!receiver_id) {
      throw new Error('Receiver ID is required');
    }

    if (receiver_id === user.id) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if receiver exists and allows friend requests
    const { data: receiverProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, allow_friend_requests')
      .eq('user_id', receiver_id)
      .single();

    if (profileError || !receiverProfile) {
      throw new Error('User not found');
    }

    if (!receiverProfile.allow_friend_requests) {
      throw new Error('This user is not accepting friend requests');
    }

    // Check if already friends
    const { data: existingFriendship } = await supabaseClient
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${receiver_id}),and(user_id.eq.${receiver_id},friend_id.eq.${user.id})`)
      .single();

    if (existingFriendship) {
      throw new Error('Already friends with this user');
    }

    // Check if request already exists
    const { data: existingRequest } = await supabaseClient
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new Error('Friend request already pending');
      }
      // Delete old rejected/cancelled request
      await supabaseClient
        .from('friend_requests')
        .delete()
        .eq('id', existingRequest.id);
    }

    // Create friend request
    const { data: friendRequest, error: requestError } = await supabaseClient
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiver_id,
        message: message || null,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) {
      throw requestError;
    }

    // Create notification for receiver
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'friend_request',
        title: 'طلب صداقة جديد',
        message: 'لديك طلب صداقة جديد',
        data: { request_id: friendRequest.id, sender_id: user.id }
      });

    console.log('Friend request sent successfully:', friendRequest.id);

    return new Response(
      JSON.stringify({ success: true, data: friendRequest }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-friend-request:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});