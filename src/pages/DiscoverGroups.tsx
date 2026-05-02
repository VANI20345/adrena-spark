import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Users, MapPin, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupSearchBar } from '@/components/Groups/GroupSearchBar';
import { GroupFilters, getDefaultFilters } from '@/components/Groups/AdvancedSearchFilters';
import { useSearchGroups, useDiscoverGroups, useGroupMembersAvatarsMap } from '@/hooks/useGroupQueries';
import GuestBlurOverlay from '@/components/Auth/GuestBlurOverlay';

export default function DiscoverGroups() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<GroupFilters>(getDefaultFilters());
  const isRTL = language === 'ar';

  // Check if any filters are active
  const hasActiveFilters = 
    filters.interests.length > 0 ||
    filters.cities.length > 0 ||
    filters.gender.length > 0 ||
    filters.memberRange[0] !== 0 ||
    filters.memberRange[1] !== 500 ||
    filters.ageRange[0] !== 18 ||
    filters.ageRange[1] !== 65;

  // Use search/filter hook when search or filters are active
  const { data: searchResults = [], isLoading: isSearching } = useSearchGroups(
    searchTerm,
    hasActiveFilters ? filters : undefined
  );

  // Use discover groups hook - works for both anonymous and logged in users
  const { data: discoverGroupsData = [], isLoading: isLoadingDiscover, error: discoverError } = useDiscoverGroups(user?.id);

  // Get member avatars (may be empty for anonymous users viewing private groups)
  const { data: groupMembersMapData = {} } = useGroupMembersAvatarsMap();
  const groupMembersMap: Record<string, any[]> = groupMembersMapData || {};

  // Determine which groups to show
  const showSearchResults = searchTerm.length > 0 || hasActiveFilters;
  const displayGroups = showSearchResults ? searchResults : discoverGroupsData;
  const isLoading = showSearchResults ? isSearching : isLoadingDiscover;

  const renderGroupCard = (group: any) => (
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
  );

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <GuestBlurOverlay
        isGuest={!user}
        title={isRTL ? 'يجب أن تسجل الدخول لإكمال مغامرتك' : 'Sign in to continue your adventure'}
        subtitle={isRTL ? 'سجل دخولك للانضمام إلى القروبات والتفاعل مع الأعضاء' : 'Sign in to join groups and interact with members'}
        buttonText={isRTL ? 'تسجيل الدخول' : 'Sign in'}
      >
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-8">
            {user && (
              <Button
                variant="ghost"
                onClick={() => navigate('/groups')}
                className="mb-4"
              >
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'رجوع' : 'Back'}
              </Button>
            )}
            <h1 className="text-3xl font-bold mb-2">
              {isRTL ? 'اكتشف معنا' : 'Discover Groups'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL 
                ? `${displayGroups?.length || 0} مجموعة متاحة` 
                : `${displayGroups?.length || 0} groups available`}
            </p>
          </div>

        {/* Search Bar with Integrated Filters - Same as GroupsOverview */}
        <div className="mb-6">
          <GroupSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : displayGroups.length > 0 ? (
            displayGroups.map((group) => renderGroupCard(group))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {showSearchResults 
                ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching results')
                : (isRTL ? 'لا توجد مجموعات متاحة' : 'No groups available')
              }
            </div>
          )}
        </div>
        </main>
      </GuestBlurOverlay>
      <Footer />
    </div>
  );
}