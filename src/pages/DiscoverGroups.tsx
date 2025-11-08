import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Search, Users, MapPin, ArrowLeft, Filter, X } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface FilterState {
  categories: string[];
  city: string;
  participantRange: [number, number];
  ageRange: [number, number];
  gender: string;
}

export default function DiscoverGroups() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  const isRTL = language === 'ar';

  // Load active filters from sessionStorage
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('groupFilters');
    if (savedFilters) {
      setActiveFilters(JSON.parse(savedFilters));
    }
  }, []);

  const removeFilter = (filterType: keyof FilterState) => {
    if (!activeFilters) return;
    
    const updated = { ...activeFilters };
    if (filterType === 'categories') {
      updated.categories = [];
    } else if (filterType === 'city') {
      updated.city = '';
    } else if (filterType === 'gender') {
      updated.gender = 'all';
    } else if (filterType === 'participantRange') {
      updated.participantRange = [0, 500];
    } else if (filterType === 'ageRange') {
      updated.ageRange = [18, 65];
    }
    
    setActiveFilters(updated);
    sessionStorage.setItem('groupFilters', JSON.stringify(updated));
  };

  const clearAllFilters = () => {
    setActiveFilters(null);
    sessionStorage.removeItem('groupFilters');
  };

  const hasActiveFilters = activeFilters && (
    activeFilters.categories.length > 0 || 
    activeFilters.city !== '' || 
    activeFilters.gender !== 'all' ||
    activeFilters.participantRange[0] !== 0 || 
    activeFilters.participantRange[1] !== 500 ||
    activeFilters.ageRange[0] !== 18 || 
    activeFilters.ageRange[1] !== 65
  );

  // Get user's joined and organized groups to exclude them
  const { data: userGroupsData } = useSupabaseQuery({
    queryKey: ['user-all-groups', user?.id],
    queryFn: async () => {
      if (!user) return { joinedIds: [], organizedIds: [] };
      
      // Get joined groups
      const { data: joinedData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      
      // Get organized groups
      const { data: organizedData } = await supabase
        .from('event_groups')
        .select('id')
        .eq('created_by', user.id);
      
      return {
        joinedIds: (joinedData || []).map(g => g.group_id),
        organizedIds: (organizedData || []).map(g => g.id)
      };
    },
    enabled: !!user
  });

  const userGroupIds = [
    ...(userGroupsData?.joinedIds || []),
    ...(userGroupsData?.organizedIds || [])
  ];

  const { data: discoverGroups = [], isLoading } = useSupabaseQuery({
    queryKey: ['all-discover-groups', user?.id, searchTerm, userGroupIds.join(','), JSON.stringify(activeFilters)],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('event_groups')
        .select('*, cities(name, name_ar)')
        .is('archived_at', null);

      // Exclude user's groups
      if (userGroupIds.length > 0) {
        query = query.not('id', 'in', `(${userGroupIds.join(',')})`);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('group_name', `%${searchTerm}%`);
      }

      // Apply city filter
      if (activeFilters?.city && activeFilters.city !== '' && activeFilters.city !== 'all') {
        query = query.eq('city_id', activeFilters.city);
      }

      // Apply participant range filter
      if (activeFilters?.participantRange) {
        query = query
          .gte('current_members', activeFilters.participantRange[0])
          .lte('current_members', activeFilters.participantRange[1]);
      }

      query = query.order('current_members', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch interests for each group
      const groupsWithInterests = await Promise.all(
        (data || []).map(async (group) => {
          const { data: interestsData } = await supabase
            .from('group_interests')
            .select('interest_id')
            .eq('group_id', group.id);
          
          const interests = [];
          if (interestsData && interestsData.length > 0) {
            for (const item of interestsData) {
              const { data: category } = await supabase
                .from('categories')
                .select('name, name_ar')
                .eq('id', item.interest_id)
                .single();
              if (category) interests.push(category);
            }
          }
          
          return { ...group, interests };
        })
      );
      
      return groupsWithInterests;
    },
    enabled: !!user
  });

  const { data: groupMembersMapData } = useSupabaseQuery({
    queryKey: ['group-members-avatars-discover'],
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
            {isRTL ? 'اكتشف معنا' : 'Discover Groups'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? `${discoverGroups?.length || 0} مجموعة متاحة` 
              : `${discoverGroups?.length || 0} groups available`}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={isRTL ? 'ابحث عن مجموعة...' : 'Search for a group...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>
            <Button 
              variant={hasActiveFilters ? "default" : "outline"}
              size="icon"
              onClick={() => navigate('/groups/filter')}
              className="relative"
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && activeFilters && (
            <div className="mt-3 flex flex-wrap gap-2 items-center p-3 bg-muted/50 rounded-lg">
              {activeFilters.categories.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {isRTL ? 'الفئات: ' : 'Categories: '}{activeFilters.categories.length}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter('categories')}
                  />
                </Badge>
              )}
              {activeFilters.city && activeFilters.city !== '' && activeFilters.city !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {isRTL ? 'المدينة' : 'City'}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter('city')}
                  />
                </Badge>
              )}
              {activeFilters.gender !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {isRTL ? 'الجنس: ' : 'Gender: '}
                  {activeFilters.gender === 'male' ? (isRTL ? 'ذكور' : 'Male') : (isRTL ? 'إناث' : 'Female')}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter('gender')}
                  />
                </Badge>
              )}
              {(activeFilters.participantRange[0] !== 0 || activeFilters.participantRange[1] !== 500) && (
                <Badge variant="secondary" className="gap-1">
                  {isRTL ? 'المشاركين: ' : 'Participants: '}
                  {activeFilters.participantRange[0]}-{activeFilters.participantRange[1]}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter('participantRange')}
                  />
                </Badge>
              )}
              {(activeFilters.ageRange[0] !== 18 || activeFilters.ageRange[1] !== 65) && (
                <Badge variant="secondary" className="gap-1">
                  {isRTL ? 'العمر: ' : 'Age: '}
                  {activeFilters.ageRange[0]}-{activeFilters.ageRange[1]}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter('ageRange')}
                  />
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="h-6 text-xs"
              >
                {isRTL ? 'مسح الكل' : 'Clear all'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : discoverGroups.length > 0 ? (
            discoverGroups.map((group) => (
              <Card 
                key={group.id}
                className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-16 h-16 text-primary/40" />
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{group.group_name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {isRTL ? 'السعودية' : 'Saudi Arabia'}
                          {group.cities && `, ${isRTL ? group.cities.name_ar : group.cities.name}`}
                        </span>
                      </div>
                      {group.interests && group.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
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
                : (isRTL ? 'لا توجد مجموعات للاكتشاف' : 'No groups to discover')}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
