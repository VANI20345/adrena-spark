import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Search, Users, MapPin, Filter, Plus, TrendingUp } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { CreateGroupDialog } from '@/components/Groups/CreateGroupDialog';

export default function GroupsOverview() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const isRTL = language === 'ar';

  // My Groups - groups the user has joined
  const { data: myGroups = [] } = useSupabaseQuery({
    queryKey: ['my-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          role,
          event_groups (
            id, group_name, group_type, current_members, max_members, 
            created_at, created_by
          )
        `)
        .eq('user_id', user.id)
        .limit(6);
      if (error) throw error;
      return data?.map(m => ({ ...m.event_groups, memberRole: m.role })) || [];
    },
    enabled: !!user
  });

  // Organizer Groups - groups created by user
  const { data: organizerGroups = [] } = useSupabaseQuery({
    queryKey: ['organizer-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('event_groups')
        .select('*')
        .eq('created_by', user.id)
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Discover Groups - recommended/popular groups
  const { data: discoverGroups = [] } = useSupabaseQuery({
    queryKey: ['discover-groups', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('event_groups')
        .select(`
          *,
          group_members (user_id)
        `)
        .is('archived_at', null)
        .order('current_members', { ascending: false })
        .limit(12);

      if (searchTerm) {
        query = query.ilike('group_name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Get member avatars for a group
  const { data: groupMembersMap = {} } = useSupabaseQuery({
    queryKey: ['group-members-avatars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          profiles (avatar_url, full_name)
        `)
        .limit(100);
      
      if (error) throw error;
      
      // Group by group_id
      const membersMap: Record<string, any[]> = {};
      data?.forEach(item => {
        if (!membersMap[item.group_id]) {
          membersMap[item.group_id] = [];
        }
        if (membersMap[item.group_id].length < 3) {
          membersMap[item.group_id].push(item.profiles);
        }
      });
      
      return membersMap;
    }
  });

  const renderGroupCard = (group: any, showRole: boolean = false) => (
    <Card 
      key={group.id} 
      className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      {/* Group Image Placeholder */}
      <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Users className="w-16 h-16 text-primary/40" />
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title & Badge */}
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg line-clamp-1">{group.group_name}</h3>
              {showRole && group.memberRole === 'owner' && (
                <Badge variant="default" className="text-xs">
                  {isRTL ? 'مالك' : 'Owner'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {group.group_type === 'region' ? 
                  (isRTL ? 'منطقة' : 'Region') : 
                  (isRTL ? 'فعالية' : 'Event')}
              </Badge>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {isRTL ? 'السعودية' : 'Saudi Arabia'}
              </span>
            </div>
          </div>

          {/* Members Count & Avatars */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {(groupMembersMap[group.id] || []).map((member: any, idx: number) => (
                  <Avatar key={idx} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={member?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {member?.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {group.current_members || 0} {isRTL ? 'عضو' : 'members'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-4">
              {isRTL ? 'المجموعات والفعاليات' : 'Groups & Events'}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {isRTL 
                ? 'تواصل مع المغامرين، انضم للفعاليات، وشارك تجاربك' 
                : 'Connect with adventurers, join events, and share your experiences'}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button onClick={() => navigate('/groups/my-groups')} size="lg">
              <Users className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'مجموعاتي' : 'My Groups'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/events')} size="lg">
              {isRTL ? 'الفعاليات' : 'Events'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/leaderboard')} size="lg">
              <TrendingUp className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'لوحة المتصدرين' : 'Leaderboard'}
            </Button>
            <CreateGroupDialog 
              events={[]}
              onGroupCreated={() => {}}
            />
          </div>
        </div>

        {/* My Groups Section */}
        {myGroups.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {isRTL ? 'مجموعاتي' : 'My Groups'}
              </h2>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/groups/my-groups')}
              >
                {isRTL ? 'عرض الكل' : 'View All'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myGroups.map(group => renderGroupCard(group, true))}
            </div>
          </section>
        )}

        {/* Organizer Groups Section */}
        {organizerGroups.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {isRTL ? 'المجموعات التي أديرها' : 'Groups I Organize'}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizerGroups.map(group => renderGroupCard(group))}
            </div>
          </section>
        )}

        {/* Discover Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold">
              {isRTL ? 'اكتشف معنا' : 'Discover with Us'}
            </h2>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground`} />
                <Input
                  placeholder={isRTL ? 'ابحث عن مجموعة...' : 'Search groups...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigate('/groups/filter')}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {discoverGroups.length > 0 ? (
              discoverGroups.map(group => renderGroupCard(group))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {isRTL ? 'لا توجد مجموعات' : 'No groups found'}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
