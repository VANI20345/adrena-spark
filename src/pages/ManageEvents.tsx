import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, Eye, Edit, Trash2, Plus, Search, QrCode, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { eventsService } from '@/services/supabaseServices';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const ManageEventsPage = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalAttendees: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t, language } = useLanguageContext();

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    const refreshData = () => {
      if (user) {
        fetchEvents();
        fetchStats();
      }
    };

    window.addEventListener('focus', refreshData);
    return () => window.removeEventListener('focus', refreshData);
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await eventsService.getByOrganizer(user?.id || '');
      
      if (error) throw error;

      const eventsWithData = await Promise.all((data || []).map(async (event) => {
        const { data: ratingsData } = await supabase
          .from('rating_summaries')
          .select('average_rating, total_reviews')
          .eq('entity_id', event.id)
          .eq('entity_type', 'event')
          .maybeSingle();

        return {
          ...event,
          revenue: event.bookings
            ?.filter(booking => booking.status === 'confirmed')
            ?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0,
          rating: ratingsData?.average_rating || 0
        };
      }));

      setEvents(eventsWithData);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error(t('manageEvents.errorLoadingEvents'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user?.id);

      const { count: activeEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user?.id)
        .eq('status', 'active');

      const { data: revenueData } = await supabase
        .from('bookings')
        .select('total_amount, events!inner(organizer_id)')
        .eq('events.organizer_id', user?.id)
        .eq('status', 'confirmed');

      const totalRevenue = revenueData?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

      const { data: attendeesData } = await supabase
        .from('bookings')
        .select('quantity, events!inner(organizer_id)')
        .eq('events.organizer_id', user?.id)
        .eq('status', 'confirmed');

      const totalAttendees = attendeesData?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;

      const { data: userEvents } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', user?.id);

      const eventIds = userEvents?.map(event => event.id) || [];
      
      let averageRating = 0;
      if (eventIds.length > 0) {
        const { data: ratingsData } = await supabase
          .from('rating_summaries')
          .select('average_rating, total_reviews')
          .in('entity_id', eventIds)
          .eq('entity_type', 'event');

        averageRating = ratingsData?.length > 0 
          ? ratingsData.reduce((sum, rating) => sum + Number(rating.average_rating || 0), 0) / ratingsData.length 
          : 0;
      }

      setStats({
        totalEvents: totalEvents || 0,
        activeEvents: activeEvents || 0,
        totalRevenue,
        averageRating: Number(averageRating.toFixed(1)),
        totalAttendees
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">{t('manageEvents.statusActive')}</Badge>;
      case 'completed':
        return <Badge variant="secondary">{t('manageEvents.statusCompleted')}</Badge>;
      case 'draft':
        return <Badge variant="outline">{t('manageEvents.statusDraft')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{t('manageEvents.statusCancelled')}</Badge>;
      default:
        return <Badge variant="outline">{t('manageEvents.statusUnknown')}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const EventCard = ({ event }: { event: any }) => (
    <Card className="overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/4">
          <img 
            src={event.image_url || '/placeholder.svg'} 
            alt={event.title || event.title_ar} 
            className="w-full h-48 md:h-full object-cover"
          />
        </div>
        <div className="md:w-3/4 p-6">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl mb-2">{language === 'ar' ? (event.title_ar || event.title) : (event.title || event.title_ar)}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{language === 'ar' ? (event.location_ar || event.location) : (event.location || event.location_ar)}</span>
                  </div>
                </div>
              </div>
              {getStatusBadge(event.status)}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-primary">{event.current_attendees || 0}</div>
                <div className="text-xs text-muted-foreground">{t('manageEvents.participant')}</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold">{event.max_attendees || 0}</div>
                <div className="text-xs text-muted-foreground">{t('manageEvents.maxCapacity')}</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-green-600">{event.revenue?.toLocaleString() || 0}</div>
                <div className="text-xs text-muted-foreground">{t('manageEvents.revenue')}</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold">{event.price || 0}</div>
                <div className="text-xs text-muted-foreground">{t('manageEvents.price')}</div>
              </div>
            </div>

            {event.rating > 0 && (
              <div className="mb-4 text-sm">
                <Badge variant="outline">{t('manageEvents.rating')}: {event.rating}/5 ⭐</Badge>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild className="gap-2">
                <Link to={`/event/${event.id}`}>
                  <Eye className="h-4 w-4" />
                  {t('manageEvents.view')}
                </Link>
              </Button>
              {event.status !== 'completed' && new Date(event.start_date) > new Date() && (
                <>
                  <Button size="sm" variant="outline" asChild className="gap-2">
                    <Link to={`/edit-event/${event.id}`}>
                      <Edit className="h-4 w-4" />
                      {t('manageEvents.edit')}
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="gap-2">
                    <Link to={`/event/${event.id}/participants`}>
                      <Users className="h-4 w-4" />
                      {t('manageEvents.participants')}
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="gap-2">
                    <Link to={`/qr-scanner?mode=generate&event=${event.id}`}>
                      <QrCode className="h-4 w-4" />
                      QR Code
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="gap-2">
                    <Link to={`/groups?event=${event.id}`}>
                      <MessageCircle className="h-4 w-4" />
                      {t('manageEvents.eventGroup')}
                    </Link>
                  </Button>
                </>
              )}
              {event.status === 'active' && new Date(event.start_date) > new Date() && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="gap-2"
                  onClick={() => {
                    if (window.confirm(t('manageEvents.cancelConfirmation'))) {
                      toast.error(t('manageEvents.cancelInProgress'));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('manageEvents.cancel')}
                </Button>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );

  const getEventsForTab = (tab: string) => {
    const now = new Date();
    switch (tab) {
      case 'active':
        return events.filter(event => 
          event.status === 'active' || 
          (event.status === 'approved' && new Date(event.end_date) > now)
        );
      case 'completed':
        return events.filter(event => 
          event.status === 'completed' || 
          (event.status === 'active' && new Date(event.end_date) < now)
        );
      case 'draft':
        return events.filter(event => event.status === 'pending' || event.status === 'draft');
      case 'cancelled':
        return events.filter(event => event.status === 'cancelled');
      default:
        return [];
    }
  };

  const filteredEvents = getEventsForTab(activeTab).filter(event =>
    (event.title_ar || event.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.location_ar || event.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('manageEvents.loadingEvents')}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('manageEvents.title')}</h1>
              <p className="text-muted-foreground">
                {t('manageEvents.subtitle')}
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/create-event">
                <Plus className="h-4 w-4" />
                {t('manageEvents.createNewEvent')}
              </Link>
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('manageEvents.searchEvents')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageEvents.totalEvents')}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">{t('manageEvents.allEvents')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageEvents.activeEvents')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeEvents}</div>
                <p className="text-xs text-muted-foreground">{stats.totalAttendees} {t('manageEvents.totalParticipants')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageEvents.totalRevenue')}</CardTitle>
                <div className="text-green-600">{t('wallet.riyal')}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{t('manageEvents.saudiRiyal')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageEvents.averageRating')}</CardTitle>
                <div className="text-yellow-500">⭐</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageRating}</div>
                <p className="text-xs text-muted-foreground">{t('manageEvents.outOf5Stars')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">{t('manageEvents.active')} ({getEventsForTab('active').length})</TabsTrigger>
              <TabsTrigger value="completed">{t('manageEvents.completed')} ({getEventsForTab('completed').length})</TabsTrigger>
              <TabsTrigger value="draft">{t('manageEvents.drafts')} ({getEventsForTab('draft').length})</TabsTrigger>
              <TabsTrigger value="cancelled">{t('manageEvents.cancelled')} ({getEventsForTab('cancelled').length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {filteredEvents.length > 0 ? (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? t('manageEvents.noResults') : 
                        activeTab === 'active' ? t('manageEvents.noActiveEvents') : 
                        activeTab === 'completed' ? t('manageEvents.noCompletedEvents') : 
                        activeTab === 'draft' ? t('manageEvents.noDrafts') : 
                        t('manageEvents.noCancelledEvents')}
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {searchTerm ? t('manageEvents.tryDifferentSearch') : t('manageEvents.createFirstEvent')}
                    </p>
                    {!searchTerm && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {activeTab === 'draft' ? t('manageEvents.draftsNote') : ''}
                        </p>
                        <Button asChild>
                          <Link to="/create-event">{t('manageEvents.createNewEvent')}</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ManageEventsPage;
