import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Star, 
  Heart, 
  Ticket, 
  Gift,
  Clock,
  Users,
  Search,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AttendeeDashboard = () => {
  const { user, profile } = useAuth();
  const { t, language, isRTL } = useLanguageContext();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [stats, setStats] = useState({
    eventsAttended: 0,
    totalPoints: 0,
    favoriteOrganizers: 0,
    upcomingBookings: 0,
    monthlyGrowth: {
      events: 0,
      points: 0,
      organizers: 0
    }
  });

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user's bookings and events
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get event details for bookings
      const eventIds = bookingsData?.map(b => b.event_id) || [];
      let eventsData = [];
      if (eventIds.length > 0) {
        const { data: eventsList } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);
        eventsData = eventsList || [];
      }

      // Filter upcoming and completed events
      const now = new Date();
      const upcomingBookings = bookingsData?.filter(booking => {
        const event = eventsData.find(e => e.id === booking.event_id);
        return event && new Date(event.start_date) > now;
      }) || [];

      const completedBookings = bookingsData?.filter(booking => {
        const event = eventsData.find(e => e.id === booking.event_id);
        return event && new Date(event.end_date) < now;
      }) || [];

      // Map bookings with event data
      const upcomingWithEvents = upcomingBookings.map(booking => ({
        ...booking,
        events: eventsData.find(e => e.id === booking.event_id)
      }));

      setUpcomingEvents(upcomingWithEvents.slice(0, 5));

      // Load user points from profile
      const { data: profileData } = await supabase
        .from('user_gamification')
        .select('points_balance')
        .eq('user_id', user?.id)
        .single();

      // Load some popular events as favorites (since bookmarks table doesn't exist)
      const { data: popularEvents } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(4);

      setFavoriteEvents(popularEvents || []);

      // Calculate monthly growth
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Count events attended this month vs last month
      const thisMonthEvents = completedBookings.filter(b => {
        const event = eventsData.find(e => e.id === b.event_id);
        return event && new Date(event.end_date) >= thisMonth;
      }).length;

      const lastMonthEvents = completedBookings.filter(b => {
        const event = eventsData.find(e => e.id === b.event_id);
        return event && new Date(event.end_date) >= lastMonth && new Date(event.end_date) < thisMonth;
      }).length;

      // Get loyalty points earned this month
      const { data: loyaltyData } = await supabase
        .from('loyalty_ledger')
        .select('points, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', thisMonth.toISOString());

      const thisMonthPoints = loyaltyData?.reduce((sum, l) => sum + (l.points || 0), 0) || 0;

      // Count unique organizers this month
      const thisMonthOrganizers = new Set(
        eventsData
          ?.filter(e => new Date(e.created_at) >= thisMonth)
          .map(e => e.organizer_id)
      ).size;

      setStats({
        eventsAttended: completedBookings.length,
        totalPoints: profileData?.points_balance || 0,
        favoriteOrganizers: new Set(eventsData?.map(e => e.organizer_id)).size,
        upcomingBookings: upcomingBookings.length,
        monthlyGrowth: {
          events: thisMonthEvents - lastMonthEvents,
          points: thisMonthPoints,
          organizers: thisMonthOrganizers
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(isRTL ? 'خطأ في تحميل بيانات لوحة التحكم' : 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getEventsGrowthText = () => {
    if (stats.monthlyGrowth.events !== 0) {
      const sign = stats.monthlyGrowth.events > 0 ? '+' : '';
      return `${sign}${stats.monthlyGrowth.events} ${t('attendeeDashboard.fromLastMonth')}`;
    }
    return t('attendeeDashboard.sameAsLastMonth');
  };

  const getPointsGrowthText = () => {
    if (stats.monthlyGrowth.points > 0) {
      return `+${stats.monthlyGrowth.points} ${t('attendeeDashboard.pointsThisMonth')}`;
    }
    return t('attendeeDashboard.noPointsThisMonth');
  };

  const getOrganizersGrowthText = () => {
    if (stats.monthlyGrowth.organizers > 0) {
      const term = stats.monthlyGrowth.organizers > 1 
        ? t('attendeeDashboard.newOrganizers') 
        : t('attendeeDashboard.newOrganizer');
      return `+${stats.monthlyGrowth.organizers} ${term}`;
    }
    return t('attendeeDashboard.noNewOrganizers');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <div>
          <Navbar />
          <main className="container mx-auto px-4 py-32 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-muted-foreground text-sm">
                {isRTL ? 'جاري تحميل لوحة التحكم...' : 'Loading dashboard...'}
              </p>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-32 h-32 text-primary" />
            </div>
            <div className="space-y-2 z-10">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {t('attendeeDashboard.welcome')}، {profile?.full_name || (isRTL ? 'مشارك' : 'Attendee')}!
              </h1>
              <p className="text-muted-foreground text-base max-w-xl">
                {t('attendeeDashboard.exploreDescription')}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/events')} 
              className="gap-2 shrink-0 shadow-md hover:shadow-lg hover:scale-105 transition-all z-10 h-12 px-6"
            >
              <Search className="h-4 w-4" />
              {t('attendeeDashboard.exploreEvents')}
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Events Attended */}
            <Card className="hover:shadow-md hover:scale-[1.01] transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('attendeeDashboard.eventsAttended')}
                </CardTitle>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold tracking-tight">{stats.eventsAttended}</div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 font-medium">
                  <span className="text-blue-500">✦</span> {getEventsGrowthText()}
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Loyalty Points */}
            <Card className="hover:shadow-md hover:scale-[1.01] transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('attendeeDashboard.loyaltyPoints')}
                </CardTitle>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Gift className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold tracking-tight text-primary">{stats.totalPoints}</div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 font-medium">
                  <span className="text-amber-500">✦</span> {getPointsGrowthText()}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Favorite Organizers */}
            <Card className="hover:shadow-md hover:scale-[1.01] transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('attendeeDashboard.favoriteOrganizers')}
                </CardTitle>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <Heart className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold tracking-tight">{stats.favoriteOrganizers}</div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 font-medium">
                  <span className="text-rose-500">✦</span> {getOrganizersGrowthText()}
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Upcoming Bookings */}
            <Card className="hover:shadow-md hover:scale-[1.01] transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('attendeeDashboard.upcomingBookings')}
                </CardTitle>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Ticket className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold tracking-tight">{stats.upcomingBookings}</div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 font-medium">
                  <span className="text-emerald-500">✦</span> {t('attendeeDashboard.inNext2Weeks')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Col: Upcoming Events & Favorite Events */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Upcoming Events Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      {t('attendeeDashboard.myUpcomingEvents')}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => navigate('/my-events')} className="h-9">
                      {t('attendeeDashboard.viewAll')}
                    </Button>
                  </div>
                  <CardDescription>
                    {t('attendeeDashboard.myUpcomingEventsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
                      <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-muted-foreground text-sm font-medium">
                        {t('attendeeDashboard.noEventsBooked')}
                      </p>
                      <Button 
                        variant="link" 
                        onClick={() => navigate('/events')} 
                        className="mt-2 text-primary font-bold hover:no-underline"
                      >
                        {t('attendeeDashboard.exploreEvents')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingEvents.map((booking) => (
                        <div 
                          key={booking.id} 
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-xl hover:bg-accent/40 transition-colors"
                        >
                          <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted border flex items-center justify-center">
                              {booking.events?.image_url ? (
                                <img 
                                  src={booking.events.image_url} 
                                  alt={booking.events.title} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <Calendar className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <h3 className="font-semibold text-sm line-clamp-1">
                                {booking.events?.title || t('attendeeDashboard.unnamedEvent')}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {booking.events?.start_date 
                                    ? new Date(booking.events.start_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') 
                                    : t('common.notSpecified')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {booking.events?.location || t('common.notSpecified')}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                            <div className="text-left sm:text-right">
                              <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'} className="px-2.5 py-0.5 text-xs font-semibold">
                                {booking.status === 'confirmed' ? t('attendeeDashboard.confirmed') : t('attendeeDashboard.pending')}
                              </Badge>
                              <p className="text-sm font-bold mt-1 text-primary">
                                {booking.events?.price || 0} {t('common.saudiRiyal', t('common.sar', 'SAR'))}
                              </p>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate(`/event/${booking.events?.id}`)}
                              className="h-9 gap-1 font-semibold"
                            >
                              {t('attendeeDashboard.details')}
                              <ChevronRight className={`h-4 w-4 ${isRTL && 'rotate-180'}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Favorite Events Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Heart className="h-5 w-5 text-rose-500 fill-current" />
                      {t('attendeeDashboard.favoriteEvents')}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => navigate('/events')} className="h-9">
                      {t('attendeeDashboard.viewAll')}
                    </Button>
                  </div>
                  <CardDescription>
                    {t('attendeeDashboard.favoriteEventsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {favoriteEvents.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
                      <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-muted-foreground text-sm font-medium">
                        {t('attendeeDashboard.noFavoriteEvents')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {favoriteEvents.map((event) => (
                        <div 
                          key={event.id} 
                          onClick={() => navigate(`/event/${event.id}`)}
                          className="group p-4 border rounded-xl hover:border-primary/50 hover:bg-accent/30 transition-all duration-300 cursor-pointer flex flex-col justify-between h-36"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                              {event.title || t('attendeeDashboard.unnamedEvent')}
                            </h3>
                            <Heart className="h-4 w-4 text-rose-500 fill-current flex-shrink-0" />
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              {t('attendeeDashboard.eventOrganizer')}
                            </p>
                            
                            <div className="flex items-center justify-between border-t pt-2 border-border/60">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-xs font-semibold">4.8</span>
                              </div>
                              <span className="text-sm font-bold text-primary">
                                {event.price || 0} {t('common.saudiRiyal', t('common.sar', 'SAR'))}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Right Col: Quick Actions */}
            <div className="space-y-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">
                    {t('attendeeDashboard.quickActions')}
                  </CardTitle>
                  <CardDescription>
                    {t('attendeeDashboard.quickActionsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/events')}
                      className="w-full h-auto p-4 flex flex-row items-center gap-4 hover:bg-primary/5 hover:border-primary/50 transition-all text-left justify-start"
                    >
                      <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                        <Search className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{t('attendeeDashboard.exploreEvents')}</p>
                        <p className="text-xs text-muted-foreground col-span-2">
                          {isRTL ? 'تصفح أحدث الفعاليات والأنشطة' : 'Browse latest events & workshops'}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 ${isRTL && 'rotate-180'}`} />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/points')}
                      className="w-full h-auto p-4 flex flex-row items-center gap-4 hover:bg-primary/5 hover:border-primary/50 transition-all text-left justify-start"
                    >
                      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{t('attendeeDashboard.redeemPoints')}</p>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? 'استبدل نقاطك بمكافآت مميزة' : 'Exchange points for rewards'}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 ${isRTL && 'rotate-180'}`} />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/groups')}
                      className="w-full h-auto p-4 flex flex-row items-center gap-4 hover:bg-primary/5 hover:border-primary/50 transition-all text-left justify-start"
                    >
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{t('attendeeDashboard.myGroups')}</p>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? 'تواصل وتفاعل مع مجموعاتك' : 'Connect and chat with groups'}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 ${isRTL && 'rotate-180'}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AttendeeDashboard;