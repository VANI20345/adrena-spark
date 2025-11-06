import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Users, MapPin, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

export default function GroupsOverview() {
  const { user } = useAuth();
  const { t, language } = useLanguageContext();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  // Load joined groups
  const { data: joinedGroups = [] } = useSupabaseQuery({
    queryKey: ['my-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('*, event_groups(*)')
        .eq('user_id', user.id)
        .limit(6);
      if (error) throw error;
      return data?.map(m => m.event_groups) || [];
    },
    enabled: !!user
  });

  // Load organized groups (created by user)
  const { data: organizedGroups = [] } = useSupabaseQuery({
    queryKey: ['organized-groups', user?.id],
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

  // Load recommended groups
  const { data: recommendedGroups = [] } = useSupabaseQuery({
    queryKey: ['recommended-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_groups')
        .select('*')
        .eq('group_type', 'region')
        .is('archived_at', null)
        .order('current_members', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    }
  });

  const renderGroupCard = (group: any) => (
    <Card 
      key={group.id} 
      className="cursor-pointer hover:shadow-lg transition-all"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{group.group_name}</h3>
          <Badge variant={group.group_type === 'region' ? 'secondary' : 'default'}>
            {group.group_type === 'region' ? 
              (isRTL ? 'منطقة' : 'Region') : 
              (isRTL ? 'فعالية' : 'Event')}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4 mr-2" />
          {group.current_members || 0} {isRTL ? 'عضو' : 'members'}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {isRTL ? 'المجموعات والفعاليات' : 'Groups & Events'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isRTL 
              ? 'تواصل مع المغامرين، انضم للفعاليات، وشارك تجاربك' 
              : 'Connect with adventurers, join events, and share your experiences'}
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Button onClick={() => navigate('/groups/my-groups')}>
              {isRTL ? 'مجموعاتي' : 'My Groups'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/events')}>
              {isRTL ? 'الفعاليات' : 'Events'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/leaderboard')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              {isRTL ? 'لوحة المتصدرين' : 'Leaderboard'}
            </Button>
          </div>
        </div>

        {/* Joined Groups */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {isRTL ? 'مجموعاتي' : 'My Groups'}
            </h2>
            {joinedGroups.length > 0 && (
              <Button 
                variant="ghost" 
                onClick={() => navigate('/groups/my-groups')}
              >
                {isRTL ? 'عرض الكل' : 'View All'}
                <ChevronRight className="w-4 h-4 mr-2" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedGroups.length > 0 ? (
              joinedGroups.map(renderGroupCard)
            ) : (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  {isRTL ? 'لم تنضم لأي مجموعة بعد' : 'You haven\'t joined any groups yet'}
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Organized Groups */}
        {organizedGroups.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {isRTL ? 'المجموعات التي أديرها' : 'Groups I Organize'}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizedGroups.map(renderGroupCard)}
            </div>
          </section>
        )}

        {/* Recommended Groups */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {isRTL ? 'مجموعات مقترحة' : 'Recommended Groups'}
            </h2>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/groups')}
            >
              {isRTL ? 'عرض الكل' : 'View All'}
              <ChevronRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedGroups.map(renderGroupCard)}
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                {isRTL ? 'المجموعات المنضم إليها' : 'Joined Groups'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{joinedGroups.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                {isRTL ? 'مجموعات المناطق' : 'Regional Groups'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{recommendedGroups.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                {isRTL ? 'مجموعات الفعاليات' : 'Event Groups'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{organizedGroups.length}</div>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
