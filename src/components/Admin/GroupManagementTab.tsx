import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Archive, Trash2, UserMinus, Volume2, VolumeX, Search, Shield } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';

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

export const GroupManagementTab = () => {
  const [eventGroups, setEventGroups] = useState<any[]>([]);
  const [regionalGroups, setRegionalGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const { t, isRTL, language } = useLanguageContext();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('event_groups')
        .select(`
          *,
          events!event_groups_event_id_fkey(title_ar, title, end_date)
        `)
        .order('created_at', { ascending: false });

      if (eventError) throw eventError;
      
      const groupsWithAdmins = await Promise.all(
        (eventData || []).map(async (group) => {
          if (group.assigned_admin_id) {
            const { data: adminProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', group.assigned_admin_id)
              .maybeSingle();
            
            return {
              ...group,
              admin_profiles: adminProfile
            };
          }
          return group;
        })
      );
      
      setEventGroups(groupsWithAdmins);

      const { data: regionalData, error: regionalError } = await supabase
        .from('event_groups')
        .select('*')
        .is('event_id', null)
        .order('created_at', { ascending: false });

      if (regionalError) throw regionalError;
      setRegionalGroups(regionalData || []);

    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error(t('admin.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
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
      toast.error(t('admin.error'));
    }
  };

  const handleViewMembers = async (group: any) => {
    setSelectedGroup(group);
    await loadMembers(group.id);
    setShowMembersDialog(true);
  };

  const handleToggleMute = async (memberId: string, currentMuteStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ is_muted: !currentMuteStatus })
        .eq('id', memberId);

      if (error) throw error;
      
      toast.success(currentMuteStatus ? t('admin.unmute') : t('admin.mute'));
      await loadMembers(selectedGroup.id);
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error(t('admin.error'));
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm(t('admin.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await supabase
        .from('event_groups')
        .update({ 
          current_members: Math.max(0, selectedGroup.current_members - 1) 
        })
        .eq('id', selectedGroup.id);

      toast.success(t('admin.success'));
      await loadMembers(selectedGroup.id);
      await loadGroups();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(t('admin.error'));
    }
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!confirm(t('admin.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('event_groups')
        .update({ 
          archived_at: new Date().toISOString(),
          auto_delete_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', groupId);

      if (error) throw error;
      
      toast.success(t('admin.success'));
      await loadGroups();
    } catch (error) {
      console.error('Error archiving group:', error);
      toast.error(t('admin.error'));
    }
  };

  const handleDeleteGroup = async (groupId: string, isRegional: boolean = false) => {
    if (!confirm(t('admin.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('event_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      toast.success(t('admin.success'));
      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(t('admin.error'));
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
    
    const labels: Record<string, string> = {
      owner: t('admin.owner'),
      admin: t('admin.moderator'),
      moderator: t('admin.moderator'),
      member: t('admin.member')
    };

    return (
      <Badge variant={variants[role] || 'outline'}>
        {labels[role] || role}
      </Badge>
    );
  };

  const getEventTitle = (group: any) => {
    if (!group.events) return '—';
    return language === 'ar' ? group.events.title_ar : group.events.title;
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('admin.groupManagement')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">{t('admin.loading')}</div>
            ) : eventGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.noData')}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.name')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.eventTitle')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.members')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.assignedAdmin')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.status')}</TableHead>
                      <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('admin.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.group_name}</TableCell>
                        <TableCell>{getEventTitle(group)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {group.current_members} / {group.max_members}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {group.admin_profiles?.full_name || '—'}
                        </TableCell>
                        <TableCell>
                          {group.archived_at ? (
                            <Badge variant="secondary">{t('admin.archived')}</Badge>
                          ) : (
                            <Badge variant="default">{t('admin.pending') === 'Pending' ? 'Active' : 'نشط'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewMembers(group)}
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                            {!group.archived_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleArchiveGroup(group.id)}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteGroup(group.id)}
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
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('admin.viewMembers')}: {selectedGroup?.group_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
                <Input
                  placeholder={t('admin.searchMember')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.name')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.memberRole')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.joinedAt')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.memberStatus')}</TableHead>
                      <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('admin.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.profiles?.full_name || (language === 'ar' ? 'مستخدم' : 'User')}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(member.role)}
                        </TableCell>
                        <TableCell>
                          {new Date(member.joined_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </TableCell>
                        <TableCell>
                          {member.is_muted && (
                            <Badge variant="destructive">{t('admin.muted')}</Badge>
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
      </CardContent>
    </Card>
  );
};
