import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Starting statistics calculation...');

    // Calculate monthly events (approved events created in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyEvents, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'approved')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (eventsError) {
      console.error('Error calculating monthly events:', eventsError);
      throw eventsError;
    }

    // Calculate active participants (users with confirmed bookings)
    const { data: activeParticipants, error: participantsError } = await supabase
      .from('bookings')
      .select('user_id')
      .eq('status', 'confirmed')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (participantsError) {
      console.error('Error calculating active participants:', participantsError);
      throw participantsError;
    }

    // Get unique participants
    const uniqueParticipants = new Set(activeParticipants?.map(booking => booking.user_id) || []);

    // Calculate certified organizers (users with organizer role who have approved events)
    const { data: organizers, error: organizersError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        events!events_organizer_id_fkey(id, status)
      `)
      .eq('role', 'organizer');

    if (organizersError) {
      console.error('Error calculating organizers:', organizersError);
      throw organizersError;
    }

    const certifiedOrganizers = organizers?.filter(organizer => 
      organizer.events && organizer.events.some((event: any) => event.status === 'approved')
    ) || [];

    // Get total cities count
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id')
      .eq('is_active', true);

    if (citiesError) {
      console.error('Error getting cities count:', citiesError);
      throw citiesError;
    }

    // Update statistics in the database
    const updates = [
      {
        stat_key: 'monthly_events',
        stat_value_ar: `${monthlyEvents?.length || 0}+`,
        stat_value_en: `${monthlyEvents?.length || 0}+`
      },
      {
        stat_key: 'active_participants',
        stat_value_ar: `${uniqueParticipants.size}+`,
        stat_value_en: `${uniqueParticipants.size}+`
      },
      {
        stat_key: 'certified_organizers',
        stat_value_ar: `${certifiedOrganizers.length}+`,
        stat_value_en: `${certifiedOrganizers.length}+`
      },
      {
        stat_key: 'covered_cities',
        stat_value_ar: `${cities?.length || 0}`,
        stat_value_en: `${cities?.length || 0}`
      }
    ];

    // Update each statistic
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('site_statistics')
        .update({
          stat_value_ar: update.stat_value_ar,
          stat_value_en: update.stat_value_en,
          updated_at: new Date().toISOString()
        })
        .eq('stat_key', update.stat_key);

      if (updateError) {
        console.error(`Error updating ${update.stat_key}:`, updateError);
        throw updateError;
      }
    }

    console.log('Statistics updated successfully:', {
      monthlyEvents: monthlyEvents?.length || 0,
      activeParticipants: uniqueParticipants.size,
      certifiedOrganizers: certifiedOrganizers.length,
      coveredCities: cities?.length || 0
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        statistics: {
          monthlyEvents: monthlyEvents?.length || 0,
          activeParticipants: uniqueParticipants.size,
          certifiedOrganizers: certifiedOrganizers.length,
          coveredCities: cities?.length || 0
        }
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in calculate-statistics function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'خطأ في حساب الإحصائيات' 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
        status: 500 
      }
    );
  }
});