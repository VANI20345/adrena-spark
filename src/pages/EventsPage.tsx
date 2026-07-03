import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function EventsPage() {
  const { language, t } = useLanguageContext();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const { data: upcomingEventsData } = useSupabaseQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, categories(name, name_ar)')
        .eq('status', 'approved')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const organizerIds = [...new Set(data.map(e => e.organizer_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', organizerIds);

      if (profilesError) throw profilesError;

      const profilesMap = (profiles || []).reduce((acc: Record<string, any>, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      return data.map(event => ({
        ...event,
        profiles: profilesMap[event.organizer_id] || null
      }));
    }
  });

  const { data: pastEventsData } = useSupabaseQuery({
    queryKey: ['past-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, categories(name, name_ar)')
        .eq('status', 'approved')
        .lt('end_date', new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const organizerIds = [...new Set(data.map(e => e.organizer_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', organizerIds);

      if (profilesError) throw profilesError;

      const profilesMap = (profiles || []).reduce((acc: Record<string, any>, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      return data.map(event => ({
        ...event,
        profiles: profilesMap[event.organizer_id] || null
      }));
    }
  });

  const { data: allEventsData } = useSupabaseQuery({
    queryKey: ['all-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, categories(name, name_ar)')
        .eq('status', 'approved')
        .order('start_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const organizerIds = [...new Set(data.map(e => e.organizer_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', organizerIds);

      if (profilesError) throw profilesError;

      const profilesMap = (profiles || []).reduce((acc: Record<string, any>, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      return data.map(event => ({
        ...event,
        profiles: profilesMap[event.organizer_id] || null
      }));
    }
  });

  const upcomingEvents = Array.isArray(upcomingEventsData) ? upcomingEventsData : [];
  const pastEvents = Array.isArray(pastEventsData) ? pastEventsData : [];
  const allEvents = Array.isArray(allEventsData) ? allEventsData : [];

  const renderEventCard = (event: any) => (
    <Card 
      key={event.id}
      className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
      onClick={() => navigate(`/event/${event.id}`)}
    >
      {event.image_url && (
        <div className="h-48 overflow-hidden">
          <img 
            src={event.image_url} 
            alt={isRTL ? event.title_ar : event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg">
            {isRTL ? event.title_ar : event.title}
          </h3>
          {event.categories && (
            <Badge variant="secondary">
              {isRTL ? event.categories.name_ar : event.categories.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {format(new Date(event.start_date), 'PPP', { locale: isRTL ? ar : undefined })}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            {isRTL ? event.location_ar : event.location}
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            {event.current_attendees || 0} / {event.max_attendees || '∞'} {t('events.attendees')}
          </div>
          {event.price > 0 && (
            <div className="flex items-center font-semibold text-primary">
              <DollarSign className="w-4 h-4 mr-2" />
              {event.price} {t('events.currency')}
            </div>
          )}
          {event.profiles && (
            <div className="flex items-center pt-2 border-t">
              <div className="text-xs">
                {t('events.organizer')}: <span className="font-medium">{event.profiles.full_name}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {isRTL ? 'الفعاليات' : 'Events'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isRTL 
              ? 'اكتشف الفعاليات المثيرة وسجل الآن' 
              : 'Discover exciting events and register now'}
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="upcoming">
              {isRTL ? 'القادمة' : 'Upcoming'}
            </TabsTrigger>
            <TabsTrigger value="past">
              {isRTL ? 'السابقة' : 'Past'}
            </TabsTrigger>
            <TabsTrigger value="all">
              {isRTL ? 'الكل' : 'All'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(renderEventCard)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  {isRTL ? 'لا توجد فعاليات قادمة' : 'No upcoming events'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="past">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.length > 0 ? (
                pastEvents.map(renderEventCard)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  {isRTL ? 'لا توجد فعاليات سابقة' : 'No past events'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allEvents.length > 0 ? (
                allEvents.map(renderEventCard)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  {isRTL ? 'لا توجد فعاليات' : 'No events available'}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
