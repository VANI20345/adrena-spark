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

    const { event_id, friend_ids, message } = await req.json();

    if (!event_id || !friend_ids || !Array.isArray(friend_ids) || friend_ids.length === 0) {
      throw new Error('Missing event_id or friend_ids');
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('title, title_ar')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Get sender profile
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const senderName = senderProfile?.full_name || 'صديق';

    // Share with each friend
    const shares = [];
    const notifications = [];

    for (const friend_id of friend_ids) {
      // Verify friendship
      const { data: friendship } = await supabaseClient
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!friendship) {
        console.warn(`Not friends with user ${friend_id}, skipping`);
        continue;
      }

      shares.push({
        event_id,
        shared_by: user.id,
        shared_with: friend_id,
        message: message || null
      });

      notifications.push({
        user_id: friend_id,
        type: 'event_shared',
        title: 'صديق شارك فعالية معك',
        message: `${senderName} شارك معك فعالية: ${event.title_ar}${message ? `\n\n"${message}"` : ''}`,
        data: {
          event_id,
          shared_by: user.id,
          message
        }
      });
    }

    // Insert shares
    if (shares.length > 0) {
      const { error: shareError } = await supabaseClient
        .from('event_shares')
        .insert(shares);

      if (shareError) throw shareError;

      // Create activity
      const { error: activityError } = await supabaseClient
        .from('friend_activities')
        .insert({
          user_id: user.id,
          activity_type: 'shared_event',
          event_id,
          activity_data: { shared_with_count: friend_ids.length }
        });

      if (activityError) {
        console.error('Error creating activity:', activityError);
      }

      // Send notifications
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      }
    }

    console.log(`Event ${event_id} shared with ${shares.length} friends by ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, shared_count: shares.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in share-event:', error);
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