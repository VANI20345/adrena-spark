import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FollowRequest {
  target_user_id: string;
  action: 'follow' | 'unfollow';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { target_user_id, action }: FollowRequest = await req.json();

    if (!target_user_id || !action) {
      throw new Error('Missing required fields');
    }

    console.log(`User ${user.id} attempting to ${action} user ${target_user_id}`);

    // Check if target user is admin
    const { data: targetRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', target_user_id)
      .eq('role', 'admin')
      .single();

    // Check if current user is admin
    const { data: currentUserRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    const isTargetAdmin = !!targetRoles;
    const isCurrentUserAdmin = !!currentUserRoles;

    // Prevent non-admins from following admins
    if (action === 'follow' && isTargetAdmin && !isCurrentUserAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'لا يمكن متابعة المسؤولين'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (action === 'follow') {
      // Check if already following
      const { data: existing } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', target_user_id)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'أنت تتابع هذا المستخدم بالفعل'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Create follow relationship
      const { error: followError } = await supabase
        .from('followers')
        .insert({
          follower_id: user.id,
          following_id: target_user_id
        });

      if (followError) {
        console.error('Follow error:', followError);
        throw followError;
      }

      console.log(`Successfully followed user ${target_user_id}`);

      // Create notification for followed user
      await supabase.from('notifications').insert({
        user_id: target_user_id,
        title: 'متابع جديد',
        message: 'بدأ شخص ما بمتابعتك',
        type: 'follow',
        data: { follower_id: user.id }
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم المتابعة بنجاح'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else if (action === 'unfollow') {
      // Remove follow relationship
      const { error: unfollowError } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', target_user_id);

      if (unfollowError) {
        console.error('Unfollow error:', unfollowError);
        throw unfollowError;
      }

      console.log(`Successfully unfollowed user ${target_user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم إلغاء المتابعة بنجاح'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in follow-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
