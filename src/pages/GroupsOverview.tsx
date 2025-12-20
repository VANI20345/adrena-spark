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
import { CreateGroupDialog } from '@/components/Groups/CreateGroupDialog';
import { GroupSearchBar } from '@/components/Groups/GroupSearchBar';
import { GroupFilters } from '@/components/Groups/AdvancedSearchFilters';
import { useMyGroups, useDiscoverGroups, useSearchGroups, useGroupMembersAvatarsMap } from '@/hooks/useGroupQueries';

export default function GroupsOverview() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<GroupFilters>({
    interests: [],
    cities: [],
    memberRange: [0, 500],
    ageRange: [18, 65],
    gender: []
  });
  const isRTL = language === 'ar';

  // Use optimized TanStack Query hooks
  const { data: myGroupsData } = useMyGroups(user?.id);
  const { data: discoverGroupsData } = useDiscoverGroups(user?.id);
  const { data: searchResultsData } = useSearchGroups(searchTerm, filters);
  const { data: groupMembersMapData } = useGroupMembersAvatarsMap();

  // Extract organizer and joined groups from single hook
  const organizerGroups = myGroupsData?.organizer || [];
  const myGroups = myGroupsData?.joined || [];
  const discoverGroups = discoverGroupsData || [];
  const searchResults = searchResultsData || [];
  const groupMembersMap: Record<string, any[]> = groupMembersMapData || {};

  const renderGroupCard = (group: any, showRole: boolean = false) => (
    <Card 
      key={group.id} 
      className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      {/* Group Image */}
      <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative overflow-hidden">
        {group.image_url ? (
          <img 
            src={group.image_url} 
            alt={group.group_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="w-16 h-16 text-primary/40" />
          </div>
        )}
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

  // Display search results or sections
  const showSearchResults = searchTerm.length > 0;
  const displayGroups = showSearchResults ? searchResults : [];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center space-y-4">
          <div>
            <h1 className="text-4xl font-bold mb-4">
              {isRTL ? 'المجموعات' : 'Groups'}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {isRTL 
                ? 'تواصل مع المغامرين، انضم للمجموعات، وشارك تجاربك' 
                : 'Connect with adventurers, join groups, and share your experiences'}
            </p>
          </div>
          
          {/* Search Bar with Filters and Create Group Button */}
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="flex-1">
              <GroupSearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
            <CreateGroupDialog 
              onGroupCreated={() => {}}
            />
          </div>
        </div>

        {/* Search Results */}
        {showSearchResults ? (
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {isRTL ? 'نتائج البحث' : 'Search Results'}
              </h2>
              <p className="text-muted-foreground">
                {isRTL ? `${displayGroups.length} مجموعة` : `${displayGroups.length} groups found`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayGroups.length > 0 ? (
                displayGroups.map(group => renderGroupCard(group))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  {isRTL ? 'لا توجد نتائج' : 'No results found'}
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Organizer Groups Section - FIRST */}
            {organizerGroups.length > 0 && (
              <section className="mb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {isRTL ? 'المجموعات التي أديرها' : 'Groups I Organize'}
                  </h2>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/groups/organized-groups')}
                  >
                    {isRTL ? 'عرض الكل' : 'View All'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {organizerGroups.slice(0, 3).map(group => renderGroupCard(group))}
                </div>
              </section>
            )}

            {/* My Joined Groups Section - SECOND */}
            {myGroups.length > 0 && (
              <section className="mb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {isRTL ? 'المجموعات المنضمة' : 'My Joined Groups'}
                  </h2>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/groups/joined-groups')}
                  >
                    {isRTL ? 'عرض الكل' : 'View All'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myGroups.slice(0, 3).map(group => renderGroupCard(group, true))}
                </div>
              </section>
            )}

            {/* Discover Section - THIRD */}
            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {isRTL ? 'اكتشف معنا' : 'Discover with Us'}
                </h2>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/groups/discover-groups')}
                >
                  {isRTL ? 'عرض الكل' : 'View All'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {discoverGroups.length > 0 ? (
                  discoverGroups.slice(0, 3).map(group => renderGroupCard(group))
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    {isRTL ? 'لا توجد مجموعات' : 'No groups found'}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
