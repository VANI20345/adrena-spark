import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Archive, Trash2, UserMinus, Volume2, VolumeX, Search, Shield, AlertTriangle, Eye } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  is_muted: boolean;
  joined_at: string;
  profiles?: {
    full_name: string;
  };
}

interface GroupReport {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  entity_type: string;
  reporter_name?: string;
}

export const GroupManagementTab = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [reports, setReports] = useState<GroupReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const { t, isRTL, language } = useLanguageContext();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Fetch report counts for each group
      const groupIds = (groupsData || []).map(g => g.id);
      
      // Get reports for groups themselves
      const { data: groupReportsData } = await supabase
        .from('entity_reports')
        .select('entity_id')
        .eq('entity_type', 'group')
        .in('entity_id', groupIds);

      // Create a map of report counts
      const reportCounts: Record<string, number> = {};
      (groupReportsData || []).forEach(report => {
        reportCounts[report.entity_id] = (reportCounts[report.entity_id] || 0) + 1;
      });

      // Fetch event data for groups with event_id
      const groupsWithEventId = (groupsData || []).filter(g => g.event_id);
      let eventsMap: Record<string, any> = {};
      
      if (groupsWithEventId.length > 0) {
        const eventIds = groupsWithEventId.map(g => g.event_id);
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title_ar, title, end_date')
          .in('id', eventIds);
        
        (eventsData || []).forEach(event => {
          eventsMap[event.id] = event;
        });
      }

      // Fetch admin profiles
      const groupsWithAdmins = await Promise.all(
        (groupsData || []).map(async (group) => {
          let adminProfile = null;
          if (group.assigned_admin_id) {
            const { data } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', group.assigned_admin_id)
              .maybeSingle();
            adminProfile = data;
          }
          
          return {
            ...group,
            events: group.event_id ? eventsMap[group.event_id] : null,
            admin_profiles: adminProfile,
            report_count: reportCounts[group.id] || 0
          };
        })
      );
      
      setGroups(groupsWithAdmins);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في تحميل المجموعات' : 'Error loading groups');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('id, user_id, role, is_muted, joined_at, group_id')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', member.user_id)
            .maybeSingle();

          return {
            ...member,
            profiles: profile || { full_name: language === 'ar' ? 'مستخدم' : 'User' }
          };
        })
      );

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const loadGroupReports = async (groupId: string) => {
    try {
      // Get reports for the group itself
      const { data: groupReports, error: groupError } = await supabase
        .from('entity_reports')
        .select('*')
        .eq('entity_id', groupId)
        .eq('entity_type', 'group')
        .order('created_at', { ascending: false });

      if (groupError) throw groupError;

      // Get reports for messages in this group
      const { data: messageReports, error: messageError } = await supabase
        .from('entity_reports')
        .select('*')
        .eq('entity_type', 'group_message')
        .order('created_at', { ascending: false });

      if (messageError) throw messageError;

      // Fetch reporter names
      const allReports = [...(groupReports || []), ...(messageReports || [])];
      const reportsWithNames = await Promise.all(
        allReports.map(async (report) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', report.reporter_id)
            .maybeSingle();
          
          return {
            ...report,
            reporter_name: profile?.full_name || (language === 'ar' ? 'غير معروف' : 'Unknown')
          };
        })
      );

      setReports(reportsWithNames);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const handleViewMembers = async (group: any) => {
    setSelectedGroup(group);
    await loadMembers(group.id);
    setShowMembersDialog(true);
  };

  const handleViewReports = async (group: any) => {
    setSelectedGroup(group);
    await loadGroupReports(group.id);
    setShowReportsDialog(true);
  };

  const handleToggleMute = async (memberId: string, currentMuteStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('group_memberships')
        .update({ is_muted: !currentMuteStatus })
        .eq('id', memberId);

      if (error) throw error;
      
      toast.success(currentMuteStatus 
        ? (language === 'ar' ? 'تم إلغاء كتم العضو' : 'Member unmuted') 
        : (language === 'ar' ? 'تم كتم العضو' : 'Member muted'));
      await loadMembers(selectedGroup.id);
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد إزالة هذا العضو؟' : 'Remove this member?')) return;

    try {
      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await supabase
        .from('groups')
        .update({ 
          current_members: Math.max(0, selectedGroup.current_members - 1) 
        })
        .eq('id', selectedGroup.id);

      toast.success(language === 'ar' ? 'تم إزالة العضو' : 'Member removed');
      await loadMembers(selectedGroup.id);
      await loadGroups();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد أرشفة هذه المجموعة؟' : 'Archive this group?')) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({ 
          archived_at: new Date().toISOString(),
          auto_delete_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', groupId);

      if (error) throw error;
      
      toast.success(language === 'ar' ? 'تم أرشفة المجموعة' : 'Group archived');
      await loadGroups();
    } catch (error) {
      console.error('Error archiving group:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد حذف هذه المجموعة نهائياً؟' : 'Permanently delete this group?')) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      toast.success(language === 'ar' ? 'تم حذف المجموعة' : 'Group deleted');
      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('entity_reports')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
      
      toast.success(language === 'ar' ? 'تم تحديث حالة البلاغ' : 'Report status updated');
      await loadGroupReports(selectedGroup.id);
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const filteredMembers = members.filter(m => 
    m.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: 'default',
      admin: 'secondary',
      moderator: 'outline',
      member: 'outline'
    };
    
    const labels: Record<string, { ar: string; en: string }> = {
      owner: { ar: 'المالك', en: 'Owner' },
      admin: { ar: 'مشرف', en: 'Admin' },
      moderator: { ar: 'مشرف', en: 'Moderator' },
      member: { ar: 'عضو', en: 'Member' }
    };

    return (
      <Badge variant={variants[role] || 'outline'}>
        {labels[role]?.[language === 'ar' ? 'ar' : 'en'] || role}
      </Badge>
    );
  };

  const getEventTitle = (group: any) => {
    if (!group.events) return '—';
    return language === 'ar' ? group.events.title_ar : group.events.title;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'outline',
      reviewing: 'secondary',
      resolved: 'default',
      dismissed: 'destructive'
    };
    
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      reviewing: { ar: 'قيد المراجعة', en: 'Reviewing' },
      resolved: { ar: 'تم الحل', en: 'Resolved' },
      dismissed: { ar: 'مرفوض', en: 'Dismissed' }
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status]?.[language === 'ar' ? 'ar' : 'en'] || status}
      </Badge>
    );
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Users className="w-5 h-5" />
          {language === 'ar' ? 'إدارة المجموعات' : 'Group Management'}
          <Badge variant="secondary" className={isRTL ? 'mr-auto' : 'ml-auto'}>
            {groups.length} {language === 'ar' ? 'مجموعة' : 'groups'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {language === 'ar' ? 'لا توجد مجموعات' : 'No groups found'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                      {language === 'ar' ? 'اسم المجموعة' : 'Group Name'}
                    </TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                      {language === 'ar' ? 'الفعالية' : 'Event'}
                    </TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                      {language === 'ar' ? 'الأعضاء' : 'Members'}
                    </TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                      {language === 'ar' ? 'البلاغات' : 'Reports'}
                    </TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </TableHead>
                    <TableHead className={isRTL ? 'text-left' : 'text-right'}>
                      {language === 'ar' ? 'الإجراءات' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {group.group_name}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {getEventTitle(group)}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <Badge variant="secondary">
                          {group.current_members || 0} / {group.max_members || '∞'}
                        </Badge>
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {group.report_count > 0 ? (
                          <Badge variant="destructive" className="cursor-pointer" onClick={() => handleViewReports(group)}>
                            <AlertTriangle className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {group.report_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {group.archived_at ? (
                          <Badge variant="secondary">{language === 'ar' ? 'مؤرشف' : 'Archived'}</Badge>
                        ) : (
                          <Badge variant="default">{language === 'ar' ? 'نشط' : 'Active'}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewMembers(group)}
                            title={language === 'ar' ? 'عرض الأعضاء' : 'View Members'}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          {group.report_count > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReports(group)}
                              title={language === 'ar' ? 'عرض البلاغات' : 'View Reports'}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {!group.archived_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchiveGroup(group.id)}
                              title={language === 'ar' ? 'أرشفة' : 'Archive'}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteGroup(group.id)}
                            title={language === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-3xl" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Users className="w-5 h-5" />
                {language === 'ar' ? 'أعضاء المجموعة' : 'Group Members'}: {selectedGroup?.group_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
                <Input
                  placeholder={language === 'ar' ? 'بحث عن عضو...' : 'Search member...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                        {language === 'ar' ? 'الاسم' : 'Name'}
                      </TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                        {language === 'ar' ? 'الدور' : 'Role'}
                      </TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                        {language === 'ar' ? 'تاريخ الانضمام' : 'Joined At'}
                      </TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                        {language === 'ar' ? 'الحالة' : 'Status'}
                      </TableHead>
                      <TableHead className={isRTL ? 'text-left' : 'text-right'}>
                        {language === 'ar' ? 'الإجراءات' : 'Actions'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {member.profiles?.full_name || (language === 'ar' ? 'مستخدم' : 'User')}
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          {getRoleBadge(member.role)}
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          {new Date(member.joined_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          {member.is_muted && (
                            <Badge variant="destructive">{language === 'ar' ? 'مكتوم' : 'Muted'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                            {member.role !== 'owner' && member.role !== 'admin' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleMute(member.id, member.is_muted)}
                                  title={member.is_muted 
                                    ? (language === 'ar' ? 'إلغاء الكتم' : 'Unmute') 
                                    : (language === 'ar' ? 'كتم' : 'Mute')}
                                >
                                  {member.is_muted ? (
                                    <Volume2 className="w-4 h-4" />
                                  ) : (
                                    <VolumeX className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemoveMember(member.id, member.user_id)}
                                  title={language === 'ar' ? 'إزالة العضو' : 'Remove Member'}
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {(member.role === 'admin' || member.role === 'owner') && (
                              <Badge variant="secondary">
                                <Shield className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                {language === 'ar' ? 'محمي' : 'Protected'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reports Dialog */}
        <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertTriangle className="w-5 h-5 text-destructive" />
                {language === 'ar' ? 'بلاغات المجموعة' : 'Group Reports'}: {selectedGroup?.group_name}
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="h-[60vh]">
              {reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بلاغات' : 'No reports found'}
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {report.entity_type === 'group' 
                                  ? (language === 'ar' ? 'المجموعة' : 'Group')
                                  : (language === 'ar' ? 'رسالة' : 'Message')}
                              </Badge>
                              {getStatusBadge(report.status)}
                            </div>
                            <p className="font-medium">{report.reason}</p>
                            <div className="text-sm text-muted-foreground">
                              <span>{language === 'ar' ? 'المبلغ:' : 'Reporter:'} {report.reporter_name}</span>
                              <span className="mx-2">•</span>
                              <span>{new Date(report.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateReportStatus(report.id, 'reviewing')}
                                >
                                  {language === 'ar' ? 'مراجعة' : 'Review'}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                >
                                  {language === 'ar' ? 'حل' : 'Resolve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                                >
                                  {language === 'ar' ? 'رفض' : 'Dismiss'}
                                </Button>
                              </>
                            )}
                            {report.status === 'reviewing' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                >
                                  {language === 'ar' ? 'حل' : 'Resolve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                                >
                                  {language === 'ar' ? 'رفض' : 'Dismiss'}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
