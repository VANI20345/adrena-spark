import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Search, Users, MapPin, ArrowLeft } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export default function JoinedGroups() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const isRTL = language === 'ar';

  const { data: myGroups = [], isLoading } = useSupabaseQuery({
    queryKey: ['all-joined-groups', user?.id, searchTerm],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('group_members')
        .select(`
          role,
          joined_at,
          event_groups!inner(
            *,
            cities!city_id(name, name_ar),
            group_interests(
              interest_id,
              user_interests:interest_id(id, name, name_ar)
            )
          )
        `)
        .eq('user_id', user.id)
        .neq('event_groups.created_by', user.id)
        .is('event_groups.archived_at', null);

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('event_groups.group_name', `%${searchTerm}%`);
      }

      query = query.order('joined_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || [])
        .filter((m: any) => m.event_groups)
        .map((m: any) => ({
          ...m.event_groups,
          memberRole: m.role,
          interests: (m.event_groups.group_interests || [])
            .map((gi: any) => gi.user_interests)
            .filter(Boolean)
        }));
    },
    enabled: !!user
  });

  const { data: groupMembersMapData } = useSupabaseQuery({
    queryKey: ['group-members-avatars-joined'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          profiles (avatar_url, full_name)
        `)
        .limit(100);
      
      if (error) throw error;
      
      const membersMap: Record<string, any[]> = {};
      (data || []).forEach((item: any) => {
        const key = item.group_id || 'unknown';
        if (!membersMap[key]) {
          membersMap[key] = [];
        }
        if (membersMap[key].length < 3) {
          membersMap[key].push(item.profiles);
        }
      });
      
      return membersMap;
    }
  });
  const groupMembersMap: Record<string, any[]> = (groupMembersMapData && typeof groupMembersMapData === 'object') ? groupMembersMapData : {};

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/groups')}
            className="mb-4"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'رجوع' : 'Back'}
          </Button>
          <h1 className="text-3xl font-bold mb-2">
            {isRTL ? 'المجموعات المنضمة' : 'My Joined Groups'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? `لديك ${myGroups?.length || 0} مجموعة منضمة` 
              : `You have joined ${myGroups?.length || 0} groups`}
          </p>
        </div>

        <div className="relative mb-6">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={isRTL ? 'ابحث عن مجموعة...' : 'Search for a group...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isRTL ? 'pr-10' : 'pl-10'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : myGroups.length > 0 ? (
            myGroups.map((group) => (
              <Card 
                key={group.id}
                className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                {group.image_url ? (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={group.image_url} 
                      alt={group.group_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Users className="w-16 h-16 text-primary/40" />
                    </div>
                  </div>
                )}
                
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{group.group_name}</h3>
                        {group.memberRole === 'admin' && (
                          <Badge variant="secondary" className="text-xs">
                            {isRTL ? 'مشرف' : 'Admin'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {isRTL ? 'السعودية' : 'Saudi Arabia'}
                          {group.cities && `, ${isRTL ? group.cities.name_ar : group.cities.name}`}
                        </span>
                      </div>
                      {group.interests && group.interests.length > 0 && (
                        <div className="space-y-1 mb-2">
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'اهتمامات المجموعة' : 'Group Interests'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {group.interests.slice(0, 3).map((interest: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {isRTL ? interest.name_ar : interest.name}
                              </Badge>
                            ))}
                            {group.interests.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{group.interests.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {group.equipment && group.equipment.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'المعدات المطلوبة' : 'Required Gears'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {group.equipment.slice(0, 2).map((item: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                            {group.equipment.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{group.equipment.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

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
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {searchTerm 
                ? (isRTL ? 'لا توجد نتائج' : 'No results found')
                : (isRTL ? 'لم تنضم لأي مجموعة بعد' : 'You haven\'t joined any groups yet')}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
