import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { CreateGroupDialog } from '@/components/Groups/CreateGroupDialog';
import { GroupChat } from '@/components/Groups/GroupChat';
import { GroupMemberManagement } from '@/components/Groups/GroupMemberManagement';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabaseServices } from '@/services/supabaseServices';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  MessageSquare,
  Users,
  MapPin,
  Plus,
  Settings,
  Send,
  Crown,
  UserPlus,
  Search,
  Filter
} from 'lucide-react';

interface Group {
  id: string;
  group_name: string;
  group_type: string;
  current_members: number;
  max_members: number;
  group_link?: string;
  event_id?: string;
  created_by: string;
  created_at: string;
}

const Groups = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [userMemberships, setUserMemberships] = useState<string[]>([]);

  // Load ALL region groups from event_groups (الآن كلها في جدول واحد)
  const { data: allRegionalGroups = [], isLoading: regionalLoading, refetch: refetchRegional } = useSupabaseQuery({
    queryKey: ['all-regional-groups'],
    queryFn: useCallback(async () => {
      const { data, error } = await supabase
        .from('event_groups')
        .select('*')
        .eq('group_type', 'region')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }, [])
  });

  const { data: eventGroups = [], isLoading: eventLoading, refetch: refetchEvent } = useSupabaseQuery({
    queryKey: ['event-groups', user?.id],
    queryFn: useCallback(async () => {
      const { data, error } = await supabase
        .from('event_groups')
        .select('*')
        .neq('group_type', 'region')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }, [user?.id]),
    enabled: !!user?.id
  });

  const { data: userEvents = [] } = useSupabaseQuery({
    queryKey: ['user-events', user?.id],
    queryFn: useCallback(() => supabaseServices.events.getByOrganizer(user?.id || ''), [user?.id]),
    enabled: !!user?.id && userRole === 'organizer'
  });

  // استخدام المجموعات الإقليمية مباشرة من event_groups
  const allRegionGroups = allRegionalGroups || [];
  const isRegionLoading = regionalLoading;

  // Load user memberships
  useEffect(() => {
    if (!user) return;
    
    const loadMemberships = async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      
      if (data) {
        setUserMemberships(data.map(m => m.group_id));
      }
    };

    loadMemberships();
  }, [user]);

  const isUserMember = (groupId: string) => {
    return userMemberships.includes(groupId);
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        navigate(`/groups/${groupId}`);
        return;
      }

      // Get current group data
      const { data: groupData } = await supabase
        .from('event_groups')
        .select('current_members, max_members')
        .eq('id', groupId)
        .maybeSingle();

      // Check if group is full (only for event groups)
      if (groupData && groupData.current_members >= groupData.max_members) {
        toast({
          title: 'خطأ',
          description: 'المجموعة ممتلئة',
          variant: 'destructive'
        });
        return;
      }

      // Add user to group_members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      // Increment current_members count
      if (groupData) {
        await supabase
          .from('event_groups')
          .update({ 
            current_members: (groupData.current_members || 0) + 1
          })
          .eq('id', groupId);
      }

      toast({
        title: 'تم بنجاح!',
        description: 'تم الانضمام للمجموعة'
      });

      refetchRegional();
      refetchEvent();
      
      // Navigate to group details page
      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الانضمام للمجموعة',
        variant: 'destructive'
      });
    }
  };

  const filteredRegionGroups = allRegionGroups.filter(group =>
    group.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('groups.title', 'القروبات')}</h1>
            <p className="text-muted-foreground">{t('groupsDescription', 'تواصل مع المغامرين في منطقتك وفعالياتك')}</p>
          </div>
          {userRole === 'organizer' && (
            <CreateGroupDialog 
              events={Array.isArray(userEvents) ? userEvents : []}
              onGroupCreated={() => {
                refetchRegional();
                refetchEvent();
              }}
            />
          )}
        </div>

        <Tabs defaultValue="region" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="region">قروبات المناطق</TabsTrigger>
            <TabsTrigger value="events">قروبات الفعاليات</TabsTrigger>
          </TabsList>

          <TabsContent value="region" className="space-y-6">
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن قروب منطقة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                فلترة
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRegionGroups.map((group) => (
                    <Card key={group.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{group.group_name}</CardTitle>
                          <Badge variant="outline">
                            <MapPin className="w-3 h-3 ml-1" />
                            {group.group_type === 'region' ? 'منطقة' : 'فعالية'}
                          </Badge>
                        </div>
                        <CardDescription>
                          مجموعة إقليمية عامة - متاحة لجميع المستخدمين
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 ml-2" />
                            {group.current_members || 0} / {group.max_members} {t('groups.member', 'عضو')}
                          </div>
                          <div className="flex gap-2">
                            {isUserMember(group.id) ? (
                              <Button 
                                size="sm"
                                onClick={() => navigate(`/groups/${group.id}`)}
                              >
                                <MessageSquare className="w-4 h-4 ml-1" />
                                عرض المجموعة
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => handleJoinGroup(group.id)}
                                disabled={group.current_members >= group.max_members}
                              >
                                <UserPlus className="w-4 h-4 ml-1" />
                                {t('groups.joinGroup', 'انضم')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>إحصائيات القروبات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-primary">{allRegionGroups.length}</h3>
                      <p className="text-sm text-muted-foreground">قروب متاح</p>
                    </div>
                    <div className="text-center p-4 bg-secondary/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-secondary-foreground">
                        {allRegionGroups.reduce((sum, group) => sum + (group.current_members || 0), 0)}
                      </h3>
                      <p className="text-sm text-muted-foreground">إجمالي الأعضاء</p>
                    </div>
                    <div className="text-center p-4 bg-accent/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-accent-foreground">
                        {(eventGroups || []).filter(g => g.created_by === user?.id).length}
                      </h3>
                      <p className="text-sm text-muted-foreground">قروباتي</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {(eventGroups || []).map((group) => (
                    <Card key={group.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{group.group_name}</CardTitle>
                            <CardDescription>{group.event_id ? 'مجموعة فعالية' : 'مجموعة عامة'}</CardDescription>
                          </div>
                          <div className="flex space-x-1">
                            {group.created_by === user?.id && (
                              <Badge variant="default">
                                <Crown className="w-3 h-3 ml-1" />
                                {t('eventDetails.organizer', 'منظم')}
                              </Badge>
                            )}
                            <Badge variant="outline">{t('eventDetails.event', 'فعالية')}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 ml-2" />
                            {group.current_members} / {group.max_members} {t('groups.member', 'عضو')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(group.created_at).toLocaleDateString('ar-SA')}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/groups/${group.id}`)}
                          >
                            <MessageSquare className="w-4 h-4 ml-1" />
                            {t('groups.chat', 'دردشة')}
                          </Button>
                          
                          <GroupMemberManagement
                            groupId={group.id}
                            groupName={group.group_name}
                            isOwner={group.created_by === user?.id}
                          />
                          
                          {group.created_by === user?.id && (
                            <Button size="sm" variant="outline">
                              <Settings className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>دردشة المجموعة</CardTitle>
                    <CardDescription>تحديد مجموعة للبدء</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm">
                        اختر مجموعة لبدء المحادثة
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Groups;