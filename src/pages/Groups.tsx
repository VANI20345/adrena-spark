import React, { useState, useEffect, useCallback } from 'react';
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
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load groups from Supabase
  const { data: regionGroups = [], isLoading: regionLoading, refetch: refetchRegion } = useSupabaseQuery({
    queryKey: ['region-groups'],
    queryFn: useCallback(() => supabaseServices.groups.getRegionGroups(), [])
  });

  const { data: eventGroups = [], isLoading: eventLoading, refetch: refetchEvent } = useSupabaseQuery({
    queryKey: ['event-groups', user?.id],
    queryFn: useCallback(() => supabaseServices.groups.getEventGroups(user?.id || ''), [user?.id]),
    enabled: !!user?.id
  });

  const { data: userEvents = [] } = useSupabaseQuery({
    queryKey: ['user-events', user?.id],
    queryFn: useCallback(() => supabaseServices.events.getByOrganizer(user?.id || ''), [user?.id]),
    enabled: !!user?.id && userRole === 'organizer'
  });

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
      // Add user to group (this would need a group_members table)
      // For now, just increment the current_members count
      // Get current group data
      const { data: groupData, error: fetchError } = await supabase
        .from('event_groups')
        .select('current_members, max_members')
        .eq('id', groupId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('event_groups')
        .update({ 
          current_members: (groupData.current_members || 0) + 1
        })
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: 'تم بنجاح!',
        description: 'تم الانضمام للمجموعة'
      });

      refetchRegion();
      refetchEvent();
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الانضمام للمجموعة',
        variant: 'destructive'
      });
    }
  };

  const handleGroupCreated = () => {
    refetchRegion();
    refetchEvent();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    // This would involve sending a message to the chat
    // For now, we'll just add it locally
    const message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: user?.email || 'أنت',
      timestamp: new Date().toLocaleTimeString('ar-SA')
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const filteredRegionGroups = (regionGroups || []).filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
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
              onGroupCreated={handleGroupCreated}
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
                          {t('groupDescription', 'قروب عام لمحبي المغامرة')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 ml-2" />
            {group.current_members} / {group.max_members} {t('groups.member', 'عضو')}
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleJoinGroup(group.id)}
                            disabled={group.current_members >= group.max_members}
                          >
                            <UserPlus className="w-4 h-4 ml-1" />
                            {t('groups.joinGroup', 'انضم')}
                          </Button>
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
                      <h3 className="text-2xl font-bold text-primary">{(regionGroups || []).length}</h3>
                      <p className="text-sm text-muted-foreground">قروب متاح</p>
                    </div>
                    <div className="text-center p-4 bg-secondary/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-secondary-foreground">
                        {(regionGroups || []).reduce((sum, group) => sum + (group.current_members || 0), 0)}
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
                            onClick={() => setSelectedGroup(group)}
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
                          
                          {group.group_link && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(group.group_link, '_blank')}
                            >
                              WhatsApp
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

        {/* Chat Interface (would be shown when a group is selected) */}
        {selectedGroup && (
          <div className="mt-6">
            <GroupChat 
              groupId={selectedGroup.id} 
              groupName={selectedGroup.group_name}
              isOwner={selectedGroup.created_by === user?.id}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Groups;