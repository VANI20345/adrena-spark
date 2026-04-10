import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Shield, X, Users, Settings, Lock, UserCheck, Plus, Trash2, AlertCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  avatar_url: string;
}

interface GroupSettings {
  visibility: string;
  requires_approval: boolean;
  max_members: number | null;
  min_age: number | null;
  max_age: number | null;
  gender_restriction: string | null;
  admission_questions: string[];
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

  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<GroupSettings>({
    visibility: initialVisibility,
    requires_approval: initialRequiresApproval,
    max_members: null,
    min_age: null,
    max_age: null,
    gender_restriction: null,
    admission_questions: [],
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');

  // Fetch group details
  const { data: groupData, refetch: refetchGroup } = useQuery({
    queryKey: ['group-settings', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!groupId,
  });

  // Fetch cities for location restriction
  const { data: cities } = useQuery({
    queryKey: ['cities-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (groupData) {
      const admissionQuestions = Array.isArray(groupData.admission_questions) 
        ? groupData.admission_questions as string[]
        : [];
      
      setSettings({
        visibility: groupData.visibility,
        requires_approval: groupData.requires_approval,
        max_members: groupData.max_members,
        min_age: groupData.min_age,
        max_age: groupData.max_age,
        gender_restriction: groupData.gender_restriction,
        admission_questions: admissionQuestions,
      });
    }
  }, [groupData]);

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, groupId]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('id, user_id, role')
        .eq('group_id', groupId);

      if (error) throw error;

      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles_public')
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

      // Validate age range
      if (settings.min_age && settings.max_age && settings.min_age > settings.max_age) {
        toast({
          title: isRTL ? 'خطأ' : 'Error',
          description: isRTL ? 'الحد الأدنى للعمر يجب أن يكون أقل من الحد الأقصى' : 'Minimum age must be less than maximum age',
          variant: 'destructive'
        });
        return;
      }

      // Auto-set visibility based on requiresApproval
      const newVisibility = settings.requires_approval ? 'private' : 'public';

      const { error } = await supabase
        .from('groups')
        .update({
          visibility: newVisibility,
          requires_approval: settings.requires_approval,
          max_members: settings.max_members,
          min_age: settings.min_age,
          max_age: settings.max_age,
          gender_restriction: settings.gender_restriction,
          admission_questions: settings.admission_questions,
        })
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم الحفظ' : 'Saved',
        description: isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully'
      });

      refetchGroup();
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
        .from('group_memberships')
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
        .from('group_memberships')
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

  const addQuestion = () => {
    if (newQuestion.trim() && settings.admission_questions.length < 5) {
      setSettings(prev => ({
        ...prev,
        admission_questions: [...prev.admission_questions, newQuestion.trim()]
      }));
      setNewQuestion('');
    }
  };

  const removeQuestion = (index: number) => {
    setSettings(prev => ({
      ...prev,
      admission_questions: prev.admission_questions.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {isRTL ? 'إعدادات المجموعة' : 'Group Settings'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'إدارة إعدادات المجموعة والأعضاء والقيود' : 'Manage group settings, members, and restrictions'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 flex-shrink-0">
            <TabsList className={cn("grid w-full grid-cols-3 h-11", isRTL && "direction-rtl")}>
              <TabsTrigger value="general" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{isRTL ? 'عام' : 'General'}</span>
              </TabsTrigger>
              <TabsTrigger value="restrictions" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{isRTL ? 'القيود' : 'Restrictions'}</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{isRTL ? 'الأعضاء' : 'Members'}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-[calc(85vh-220px)]">
              <div className="px-6 pb-32 space-y-0">
              {/* General Settings Tab */}
            <TabsContent value="general" className="mt-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    {isRTL ? 'خيارات الانضمام' : 'Join Options'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="requires-approval" className="text-base font-medium">
                        {isRTL ? 'يتطلب موافقة للانضمام' : 'Requires approval to join'}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {isRTL
                          ? 'عند التفعيل: المجموعة خاصة ويحتاج الأعضاء موافقة'
                          : 'When enabled: Group is Private and members need approval'}
                      </p>
                    </div>
                    <Switch
                      id="requires-approval"
                      checked={settings.requires_approval}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requires_approval: checked }))}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      {isRTL ? 'الحد الأقصى للأعضاء' : 'Maximum Members'}
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      {isRTL ? 'اترك فارغاً لعدد غير محدود' : 'Leave empty for unlimited'}
                    </p>
                    <Input
                      type="number"
                      min="2"
                      max="10000"
                      placeholder={isRTL ? 'غير محدود' : 'Unlimited'}
                      value={settings.max_members || ''}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        max_members: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      className="max-w-[200px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Admission Questions */}
              {settings.requires_approval && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      {isRTL ? 'أسئلة القبول' : 'Admission Questions'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {isRTL 
                        ? 'أضف أسئلة يجب على المتقدمين الإجابة عليها (حتى 5 أسئلة)'
                        : 'Add questions that applicants must answer (up to 5 questions)'}
                    </p>
                    
                    <div className="space-y-2">
                      {settings.admission_questions.map((question, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <span className="flex-1 text-sm">{question}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeQuestion(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {settings.admission_questions.length < 5 && (
                      <div className="flex gap-2">
                        <Input
                          placeholder={isRTL ? 'اكتب سؤالاً...' : 'Type a question...'}
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
                        />
                        <Button onClick={addQuestion} disabled={!newQuestion.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Restrictions Tab */}
            <TabsContent value="restrictions" className="mt-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    {isRTL ? 'قيود العمر' : 'Age Restrictions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {isRTL 
                      ? 'حدد نطاق العمر المسموح به للانضمام. اترك فارغاً لعدم وجود قيود.'
                      : 'Set the allowed age range for joining. Leave empty for no restrictions.'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRTL ? 'الحد الأدنى للعمر' : 'Minimum Age'}</Label>
                      <Input
                        type="number"
                        min="13"
                        max="100"
                        placeholder={isRTL ? 'لا يوجد' : 'None'}
                        value={settings.min_age || ''}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          min_age: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'الحد الأقصى للعمر' : 'Maximum Age'}</Label>
                      <Input
                        type="number"
                        min="13"
                        max="100"
                        placeholder={isRTL ? 'لا يوجد' : 'None'}
                        value={settings.max_age || ''}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          max_age: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {isRTL ? 'قيود الجنس' : 'Gender Restrictions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {isRTL 
                      ? 'حدد من يمكنه الانضمام بناءً على الجنس'
                      : 'Specify who can join based on gender'}
                  </p>
                  <Select
                    value={settings.gender_restriction || 'all'}
                    onValueChange={(value) => setSettings(prev => ({ 
                      ...prev, 
                      gender_restriction: value === 'all' ? null : value 
                    }))}
                  >
                    <SelectTrigger className="max-w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {isRTL ? 'الجميع مرحب بهم' : 'Everyone Welcome'}
                      </SelectItem>
                      <SelectItem value="male">
                        {isRTL ? 'ذكور فقط' : 'Males Only'}
                      </SelectItem>
                      <SelectItem value="female">
                        {isRTL ? 'إناث فقط' : 'Females Only'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="mt-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {isRTL ? 'إدارة الأعضاء' : 'Member Management'}
                    <Badge variant="secondary" className="ml-2">
                      {members.length} {isRTL ? 'عضو' : 'members'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.full_name}</div>
                            <Badge variant="outline" className={cn("text-xs mt-1", {
                              'bg-amber-500/10 text-amber-600 border-amber-300': member.role === 'owner',
                              'bg-blue-500/10 text-blue-600 border-blue-300': member.role === 'admin',
                            })}>
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
                              <SelectTrigger className="w-28 h-9">
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
                              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}

                    {members.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        {isRTL ? 'لا يوجد أعضاء' : 'No members yet'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end p-6 pt-4 border-t bg-muted/30 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSaveSettings} disabled={isLoading} className="min-w-[120px]">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {isRTL ? 'جاري الحفظ...' : 'Saving...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
