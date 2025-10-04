import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Archive, Trash2, UserMinus, Volume2, VolumeX, Search, Shield } from 'lucide-react';

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

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      // تحميل مجموعات الفعاليات
      const { data: eventData, error: eventError } = await supabase
        .from('event_groups')
        .select(`
          *,
          events(title_ar, end_date),
          admin_profiles:assigned_admin_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (eventError) throw eventError;
      setEventGroups(eventData || []);

      // تحميل المجموعات الإقليمية
      const { data: regionalData, error: regionalError } = await supabase
        .from('regional_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (regionalError) throw regionalError;
      setRegionalGroups(regionalData || []);

    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('حدث خطأ في تحميل المجموعات');
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

      // جلب معلومات الأعضاء بشكل منفصل
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', member.user_id)
            .maybeSingle();

          return {
            ...member,
            profiles: profile || { full_name: 'مستخدم' }
          };
        })
      );

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('حدث خطأ في تحميل الأعضاء');
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
      
      toast.success(currentMuteStatus ? 'تم إلغاء الكتم' : 'تم كتم العضو');
      await loadMembers(selectedGroup.id);
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('حدث خطأ في تحديث حالة الكتم');
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذا العضو؟')) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // تقليل عدد الأعضاء
      await supabase
        .from('event_groups')
        .update({ 
          current_members: Math.max(0, selectedGroup.current_members - 1) 
        })
        .eq('id', selectedGroup.id);

      toast.success('تم إزالة العضو');
      await loadMembers(selectedGroup.id);
      await loadGroups();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('حدث خطأ في إزالة العضو');
    }
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!confirm('هل أنت متأكد من أرشفة هذه المجموعة؟')) return;

    try {
      const { error } = await supabase
        .from('event_groups')
        .update({ 
          archived_at: new Date().toISOString(),
          auto_delete_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', groupId);

      if (error) throw error;
      
      toast.success('تم أرشفة المجموعة - سيتم حذفها تلقائياً بعد 30 يوم');
      await loadGroups();
    } catch (error) {
      console.error('Error archiving group:', error);
      toast.error('حدث خطأ في أرشفة المجموعة');
    }
  };

  const handleDeleteGroup = async (groupId: string, isRegional: boolean = false) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة نهائياً؟')) return;

    try {
      const table = isRegional ? 'regional_groups' : 'event_groups';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      toast.success('تم حذف المجموعة نهائياً');
      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('حدث خطأ في حذف المجموعة');
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
      owner: 'مالك',
      admin: 'مشرف (أدمن)',
      moderator: 'مشرف',
      member: 'عضو'
    };

    return (
      <Badge variant={variants[role] || 'outline'}>
        {labels[role] || role}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          إدارة المجموعات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="event" className="space-y-4">
          <TabsList>
            <TabsTrigger value="event">مجموعات الفعاليات</TabsTrigger>
            <TabsTrigger value="regional">المجموعات الإقليمية</TabsTrigger>
          </TabsList>

          <TabsContent value="event" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : eventGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد مجموعات فعاليات
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المجموعة</TableHead>
                    <TableHead>الفعالية</TableHead>
                    <TableHead>الأعضاء</TableHead>
                    <TableHead>المشرف (أدمن)</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.group_name}</TableCell>
                      <TableCell>{group.events?.title_ar || '—'}</TableCell>
                      <TableCell>
                        {group.current_members} / {group.max_members}
                      </TableCell>
                      <TableCell>
                        {group.admin_profiles?.full_name || '—'}
                      </TableCell>
                      <TableCell>
                        {group.archived_at ? (
                          <Badge variant="secondary">مؤرشف</Badge>
                        ) : (
                          <Badge variant="default">نشط</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
            )}
          </TabsContent>

          <TabsContent value="regional" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : regionalGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد مجموعات إقليمية
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم (عربي)</TableHead>
                    <TableHead>المنطقة</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionalGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name_ar}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{group.region}</Badge>
                      </TableCell>
                      <TableCell>{group.description || '—'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteGroup(group.id, true)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        {/* Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                أعضاء المجموعة: {selectedGroup?.group_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن عضو..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>تاريخ الانضمام</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.profiles?.full_name || 'مستخدم'}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(member.role)}
                      </TableCell>
                      <TableCell>
                        {new Date(member.joined_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        {member.is_muted && (
                          <Badge variant="destructive">مكتوم</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                              <Shield className="w-3 h-3 ml-1" />
                              محمي
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
