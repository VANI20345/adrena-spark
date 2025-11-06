import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Search, Users, MessageSquare } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function MyGroups() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const isRTL = language === 'ar';

  const { data: myGroups = [], isLoading } = useSupabaseQuery({
    queryKey: ['all-my-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('*, event_groups(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return data?.map(m => ({ ...m.event_groups, role: m.role })) || [];
    },
    enabled: !!user
  });

  const filteredGroups = myGroups.filter(group =>
    group.group_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isRTL ? 'مجموعاتي' : 'My Groups'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? `لديك ${myGroups.length} مجموعة` 
              : `You have ${myGroups.length} groups`}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={isRTL ? 'ابحث عن مجموعة...' : 'Search for a group...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isRTL ? 'pr-10' : 'pl-10'}
          />
        </div>

        {/* Groups List with Smooth Scrolling */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <Card 
                  key={group.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{group.group_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.group_type === 'region' 
                            ? (isRTL ? 'مجموعة منطقة' : 'Regional Group')
                            : (isRTL ? 'مجموعة فعالية' : 'Event Group')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {group.role === 'owner' && (
                          <Badge variant="default">
                            {isRTL ? 'مالك' : 'Owner'}
                          </Badge>
                        )}
                        {group.role === 'admin' && (
                          <Badge variant="secondary">
                            {isRTL ? 'مشرف' : 'Admin'}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {group.group_type === 'region' 
                            ? (isRTL ? 'منطقة' : 'Region')
                            : (isRTL ? 'فعالية' : 'Event')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        {group.current_members || 0} / {group.max_members} {isRTL ? 'عضو' : 'members'}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {isRTL ? 'المحادثات' : 'Chat'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm 
                  ? (isRTL ? 'لا توجد نتائج' : 'No results found')
                  : (isRTL ? 'لم تنضم لأي مجموعة بعد' : 'You haven\'t joined any groups yet')}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
      <Footer />
    </div>
  );
}
