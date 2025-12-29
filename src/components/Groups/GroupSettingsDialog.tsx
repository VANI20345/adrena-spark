import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, X } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  avatar_url: string;
}

interface GroupSettingsDialogProps {
  groupId: string;
  open: boolean;
  onClose: () => void;
  visibility: string;
  requiresApproval: boolean;
  onSettingsSaved?: () => void;
}

export const GroupSettingsDialog: React.FC<GroupSettingsDialogProps> = ({
  groupId,
  open,
  onClose,
  visibility: initialVisibility,
  requiresApproval: initialRequiresApproval,
  onSettingsSaved
}) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const [visibility, setVisibility] = useState(initialVisibility);
  const [requiresApproval, setRequiresApproval] = useState(initialRequiresApproval);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, groupId]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id, role')
        .eq('group_id', groupId);

      if (error) throw error;

      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', member.user_id)
            .maybeSingle();

          return {
            ...member,
            full_name: profile?.full_name || (isRTL ? 'مستخدم' : 'User'),
            avatar_url: profile?.avatar_url || ''
          };
        })
      );

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);

      // Auto-set visibility based on requiresApproval
      const newVisibility = requiresApproval ? 'private' : 'public';

      const { error } = await supabase
        .from('event_groups')
        .update({
          visibility: newVisibility,
          requires_approval: requiresApproval
        })
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم الحفظ' : 'Saved',
        description: isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully'
      });

      onSettingsSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم التحديث' : 'Updated',
        description: isRTL ? 'تم تحديث صلاحيات العضو' : 'Member role updated'
      });

      loadMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل تحديث الصلاحيات' : 'Failed to update role',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم الإزالة' : 'Removed',
        description: isRTL ? 'تم إزالة العضو من المجموعة' : 'Member removed from group'
      });

      loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل إزالة العضو' : 'Failed to remove member',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isRTL ? 'إعدادات المجموعة' : 'Group Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Visibility Settings */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg mb-4">
                {isRTL ? 'خيارات الانضمام' : 'Join Options'}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="requires-approval" className="text-base">
                      {isRTL ? 'يتطلب موافقة للانضمام' : 'Requires approval to join'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isRTL
                        ? 'عند التفعيل: المجموعة خاصة ويحتاج الأعضاء موافقة. عند التعطيل: المجموعة عامة والانضمام مباشر'
                        : 'When enabled: Group is Private and members need approval. When disabled: Group is Public with direct join'}
                    </p>
                  </div>
                  <Switch
                    id="requires-approval"
                    checked={requiresApproval}
                    onCheckedChange={setRequiresApproval}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member Management */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {isRTL ? 'إدارة الأعضاء' : 'Member Management'}
              </h3>

              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>
                          {member.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.full_name}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {member.role === 'owner'
                            ? (isRTL ? 'المالك' : 'Owner')
                            : member.role === 'admin'
                            ? (isRTL ? 'مسؤول' : 'Admin')
                            : (isRTL ? 'عضو' : 'Member')}
                        </Badge>
                      </div>
                    </div>

                    {member.role !== 'owner' && member.user_id !== user?.id && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(role) => handleUpdateMemberRole(member.id, role)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              {isRTL ? 'عضو' : 'Member'}
                            </SelectItem>
                            <SelectItem value="admin">
                              {isRTL ? 'مسؤول' : 'Admin'}
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
