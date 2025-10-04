import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting archive-expired-groups job...')

    // 1. أرشفة المجموعات التي انتهت مدتها (auto_delete_at <= now)
    const { data: groupsToArchive, error: archiveError } = await supabase
      .from('event_groups')
      .select('id, group_name, event_id, auto_delete_at')
      .not('auto_delete_at', 'is', null)
      .lte('auto_delete_at', new Date().toISOString())
      .is('archived_at', null)

    if (archiveError) {
      console.error('Error fetching groups to archive:', archiveError)
      throw archiveError
    }

    console.log(`Found ${groupsToArchive?.length || 0} groups to archive`)

    if (groupsToArchive && groupsToArchive.length > 0) {
      // أرشفة المجموعات
      const { error: updateError } = await supabase
        .from('event_groups')
        .update({ 
          archived_at: new Date().toISOString(),
          // تحديد موعد الحذف النهائي بعد 30 يوم من الأرشفة
          auto_delete_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .in('id', groupsToArchive.map(g => g.id))

      if (updateError) {
        console.error('Error archiving groups:', updateError)
        throw updateError
      }

      console.log(`Archived ${groupsToArchive.length} groups`)
    }

    // 2. حذف المجموعات المؤرشفة التي مضى عليها 30 يوم
    const { data: groupsToDelete, error: deleteSelectError } = await supabase
      .from('event_groups')
      .select('id, group_name, assigned_admin_id')
      .not('archived_at', 'is', null)
      .lte('auto_delete_at', new Date().toISOString())

    if (deleteSelectError) {
      console.error('Error fetching groups to delete:', deleteSelectError)
      throw deleteSelectError
    }

    console.log(`Found ${groupsToDelete?.length || 0} groups to delete permanently`)

    if (groupsToDelete && groupsToDelete.length > 0) {
      // حذف المجموعات نهائياً (سيتم تشغيل trigger لتقليل عداد الأدمن)
      const { error: deleteError } = await supabase
        .from('event_groups')
        .delete()
        .in('id', groupsToDelete.map(g => g.id))

      if (deleteError) {
        console.error('Error deleting groups:', deleteError)
        throw deleteError
      }

      console.log(`Deleted ${groupsToDelete.length} groups permanently`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        archived: groupsToArchive?.length || 0,
        deleted: groupsToDelete?.length || 0,
        message: 'Archive and delete job completed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in archive-expired-groups:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
