import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Backup request received:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      throw new Error('Server configuration error');
    }
    
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    console.log('Verifying admin access...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('Unauthorized: No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized: ' + authError.message);
    }
    
    if (!user) {
      console.error('No user found');
      throw new Error('Unauthorized: No user found');
    }

    console.log('User authenticated:', user.id);

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('Role check error:', roleError);
      throw new Error('Error checking user role: ' + roleError.message);
    }

    if (userRole?.role !== 'admin') {
      console.error('User is not admin:', userRole?.role);
      throw new Error('Only admins can create backups');
    }

    console.log('Admin access verified');

    // Get all table data
    console.log('Starting backup process...');
    const tables = [
      'profiles',
      'events', 
      'services',
      'bookings',
      'service_bookings',
      'categories',
      'service_categories',
      'notifications',
      'user_wallets',
      'wallet_transactions',
      'system_logs',
      'system_settings'
    ];

    const backupData: any = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };

    // Fetch data from each table
    for (const table of tables) {
      console.log(`Backing up table: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) {
        console.error(`Error backing up ${table}:`, error);
      } else if (data) {
        backupData.tables[table] = data;
        console.log(`Backed up ${data.length} rows from ${table}`);
      }
    }

    // Create backup file name
    const backupFileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    console.log('Creating backup file:', backupFileName);
    
    // Store in storage bucket
    console.log('Uploading to storage...');
    const { error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(`backups/${backupFileName}`, JSON.stringify(backupData, null, 2), {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload backup: ' + uploadError.message);
    }

    console.log('Backup uploaded successfully');

    // Log the backup
    console.log('Logging backup event...');
    try {
      await supabase.rpc('log_system_event', {
        p_level: 'info',
        p_message: 'Database backup created',
        p_details: { 
          backup_file: backupFileName,
          tables_count: Object.keys(backupData.tables).length,
          admin_id: user.id
        }
      });
    } catch (logError: any) {
      console.error('Error logging event:', logError);
      // Don't fail the backup if logging fails
    }

    console.log('Backup completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Backup created successfully',
        fileName: backupFileName,
        tablesBackedUp: Object.keys(backupData.tables).length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Backup error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
