import { supabase } from '@/integrations/supabase/client';

export interface ActivityLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: any;
  created_at: string;
}

export const activityLogService = {
  async logActivity(action: string, entityType: string, entityId: string, details?: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase.from('admin_activity_logs').insert({
        admin_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  async getRecentLogs(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          admin:profiles!admin_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  },

  async getLogsByAdmin(adminId: string, limit = 50) {
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getLogsByEntity(entityType: string, entityId: string) {
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          admin:profiles!admin_id(full_name)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching entity logs:', error);
      return [];
    }
  }
};
