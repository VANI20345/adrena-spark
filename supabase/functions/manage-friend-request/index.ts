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

    const { request_id, action } = await req.json();

    if (!request_id || !action) {
      throw new Error('Request ID and action are required');
    }

    if (!['accept', 'reject', 'cancel'].includes(action)) {
      throw new Error('Invalid action');
    }

    // Get the friend request
    const { data: friendRequest, error: fetchError } = await supabaseClient
      .from('friend_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !friendRequest) {
      throw new Error('Friend request not found');
    }

    // Validate user has permission to perform action
    if (action === 'accept' || action === 'reject') {
      if (friendRequest.receiver_id !== user.id) {
        throw new Error('Only the receiver can accept or reject requests');
      }
    } else if (action === 'cancel') {
      if (friendRequest.sender_id !== user.id) {
        throw new Error('Only the sender can cancel requests');
      }
    }

    if (action === 'accept') {
      // Update request status
      await supabaseClient
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', request_id);

      // Create bidirectional friendships
      const now = new Date().toISOString();
      await supabaseClient
        .from('friendships')
        .insert([
          {
            user_id: friendRequest.sender_id,
            friend_id: friendRequest.receiver_id,
            status: 'accepted',
            requested_by: friendRequest.sender_id,
            requested_at: friendRequest.created_at,
            accepted_at: now
          },
          {
            user_id: friendRequest.receiver_id,
            friend_id: friendRequest.sender_id,
            status: 'accepted',
            requested_by: friendRequest.sender_id,
            requested_at: friendRequest.created_at,
            accepted_at: now
          }
        ]);

      // Notify sender
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: friendRequest.sender_id,
          type: 'friend_accepted',
          title: 'تم قبول طلب الصداقة',
          message: 'تم قبول طلب الصداقة الخاص بك',
          data: { friend_id: user.id }
        });

      console.log('Friend request accepted:', request_id);
    } else if (action === 'reject') {
      await supabaseClient
        .from('friend_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', request_id);

      console.log('Friend request rejected:', request_id);
    } else if (action === 'cancel') {
      await supabaseClient
        .from('friend_requests')
        .delete()
        .eq('id', request_id);

      console.log('Friend request cancelled:', request_id);
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in manage-friend-request:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});