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

    const { entityId, entityType } = await req.json();

    if (!entityId || !entityType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Entity ID and type are required' 
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          },
          status: 400 
        }
      );
    }

    console.log(`Calculating ratings for ${entityType}: ${entityId}`);

    // Get all reviews for the entity
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq(entityType === 'event' ? 'event_id' : 'service_id', entityId);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw reviewsError;
    }

    if (!reviews || reviews.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          rating: {
            averageRating: 0,
            totalReviews: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
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
    }

    // Calculate statistics
    const ratings = reviews.map(review => review.rating);
    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const totalReviews = ratings.length;

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++;
      }
    });

    // Update or insert rating summary
    const { error: upsertError } = await supabase
      .from('rating_summaries')
      .upsert({
        entity_id: entityId,
        entity_type: entityType,
        average_rating: Number(averageRating.toFixed(2)),
        total_reviews: totalReviews,
        rating_1: distribution[1],
        rating_2: distribution[2],
        rating_3: distribution[3],
        rating_4: distribution[4],
        rating_5: distribution[5],
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('Error upserting rating summary:', upsertError);
      throw upsertError;
    }

    console.log(`Rating summary updated for ${entityType} ${entityId}:`, {
      averageRating: Number(averageRating.toFixed(2)),
      totalReviews,
      distribution
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        rating: {
          averageRating: Number(averageRating.toFixed(2)),
          totalReviews,
          distribution
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
    console.error('Error in calculate-ratings function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'خطأ في حساب التقييمات' 
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