import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Star, 
  Clock, 
  Target, 
  DollarSign,
  Share2,
  Heart,
  Shield,
  MessageCircle,
  ChevronLeft,
  User,
  UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { eventsService } from "@/services/supabaseServices";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EventGalleryDialog } from "@/components/Groups/EventGalleryDialog";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organizer, setOrganizer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; initialIndex: number } | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const { data, error } = await eventsService.getById(id);
        if (error) throw error;
        setEvent(data);

        // Fetch organizer profile
        if (data?.organizer_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.organizer_id)
            .single();
          setOrganizer(profile);
        }

        // Fetch event schedules
        const { data: schedulesData } = await supabase
          .from('event_schedules')
          .select('*')
          .eq('event_id', id)
          .order('schedule_date');
        setSchedules(schedulesData || []);

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*, profiles!reviews_user_id_fkey(full_name, avatar_url)')
          .eq('event_id', id)
          .order('created_at', { ascending: false });
        setReviews(reviewsData || []);

        // Check if user has bookmarked this event
        if (user) {
          const { data: bookmark } = await supabase
            .from('event_bookmarks')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_id', id)
            .single();
          setIsBookmarked(!!bookmark);
        }
        
      } catch (error) {
        console.error('Error fetching event:', error);
        navigate('/groups');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate, user]);

  const handleBookmark = async () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب تسجيل الدخول لحفظ الفعاليات",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from('event_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', id);
        setIsBookmarked(false);
        toast({
          title: "تم إزالة الفعالية من المحفوظات",
        });
      } else {
        await supabase
          .from('event_bookmarks')
          .insert({ user_id: user.id, event_id: id });
        setIsBookmarked(true);
        toast({
          title: "تم حفظ الفعالية",
        });
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الفعالية",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title_ar || event.title,
          text: event.description_ar || event.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "تم نسخ الرابط",
        description: "تم نسخ رابط الفعالية إلى الحافظة",
      });
    }
  };

  const handleContact = () => {
    if (organizer?.phone) {
      window.open(`https://wa.me/${organizer.phone}?text=مرحباً، أريد الاستفسار عن فعالية ${event.title_ar}`);
    } else {
      toast({
        title: "معلومات الاتصال غير متوفرة",
        description: "لا توجد معلومات اتصال للمنظم",
        variant: "destructive"
      });
    }
  };

  const handleViewMap = () => {
    if (event.latitude && event.longitude) {
      window.open(`https://maps.google.com/maps?q=${event.latitude},${event.longitude}`);
    } else if (event.location_ar || event.location) {
      window.open(`https://maps.google.com/maps?q=${encodeURIComponent(event.location_ar || event.location)}`);
    } else {
      toast({
        title: "الموقع غير متوفر",
        description: "معلومات الموقع غير متوفرة",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-2xl mb-8"></div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">لم يتم العثور على الفعالية</h1>
            <Button asChild>
              <Link to="/groups">العودة الى قائمة المجموعات</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "سهل": return "bg-green-100 text-green-800";
      case "متوسط": return "bg-yellow-100 text-yellow-800";
      case "صعب": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      // Same day event
      return format(start, 'dd MMMM yyyy', { locale: ar });
    }
    
    // Multi-day event
    return `${format(start, 'dd', { locale: ar })} - ${format(end, 'dd MMMM yyyy', { locale: ar })}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/groups">
              <ChevronLeft className="w-4 h-4 ml-2" />
              العودة قائمة المجموعات
            </Link>
          </Button>
        </div>

        {/* Hero Image */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <img 
            src={event.image_url || "/api/placeholder/800/400"} 
            alt={event.title_ar || event.title}
            className="w-full h-96 object-cover"
          />
          <div className="absolute top-6 right-6 flex gap-3">
            <Button 
              size="icon" 
              variant="secondary" 
              className="bg-white/90 hover:bg-white"
              onClick={handleBookmark}
            >
              <Heart className={`w-5 h-5 ${isBookmarked ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button size="icon" variant="secondary" className="bg-white/90 hover:bg-white" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Detail Images Gallery - Smaller thumbnails with lightbox */}
        {event.detail_images && event.detail_images.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">صور الفعالية</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {event.detail_images.slice(0, 5).map((img: string, idx: number) => (
                <div 
                  key={idx} 
                  className="relative rounded-lg overflow-hidden aspect-square cursor-pointer group"
                  onClick={() => setSelectedGallery({ images: event.detail_images, initialIndex: idx })}
                >
                  <img 
                    src={img} 
                    alt={`صورة ${idx + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
              ))}
              {/* Show "+X more" on 6th thumbnail if there are more than 5 images */}
              {event.detail_images.length > 5 && (
                <div 
                  className="relative rounded-lg overflow-hidden aspect-square cursor-pointer group bg-muted hover:bg-muted/80 transition-colors"
                  onClick={() => setSelectedGallery({ images: event.detail_images, initialIndex: 5 })}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-foreground text-xl font-bold">
                      +{event.detail_images.length - 5}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex flex-wrap gap-3 mb-4">
                {event.difficulty_level && (
                  <Badge className={getDifficultyColor(event.difficulty_level)}>
                    {event.difficulty_level}
                  </Badge>
                )}
                {event.categories && (
                  <Badge variant="secondary">{event.categories.name_ar}</Badge>
                )}
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {reviews.length > 0 ? 
                      (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : 
                      "لا توجد تقييمات"
                    }
                  </span>
                  <span className="text-muted-foreground">({reviews.length} تقييم)</span>
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {event.title_ar || event.title}
              </h1>
              
              <div className="flex flex-wrap gap-6 text-muted-foreground mt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {event.location_ar || event.location}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {formatDateRange(event.start_date, event.end_date)}
                </div>
                {schedules.length === 1 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {format(new Date(`2000-01-01 ${schedules[0].start_time}`), 'p', { locale: ar })} - {format(new Date(`2000-01-01 ${schedules[0].end_time}`), 'p', { locale: ar })}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {event.current_attendees || 0}/{event.max_attendees || 0} مشارك
                </div>
              </div>
            </div>

            {/* Multi-Day Schedule Tabs */}
            {schedules.length > 1 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>جدول الأيام</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedDay.toString()} onValueChange={(val) => setSelectedDay(parseInt(val))}>
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${schedules.length}, 1fr)` }}>
                      {schedules.map((schedule, idx) => (
                        <TabsTrigger key={idx} value={idx.toString()}>
                          اليوم {idx + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {schedules.map((schedule, idx) => (
                      <TabsContent key={idx} value={idx.toString()} className="space-y-4 mt-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-lg font-semibold">
                            <Calendar className="w-5 h-5 text-primary" />
                            {format(new Date(schedule.schedule_date), 'PPP', { locale: ar })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            <span>
                              {format(new Date(`2000-01-01 ${schedule.start_time}`), 'p', { locale: ar })} - 
                              {format(new Date(`2000-01-01 ${schedule.end_time}`), 'p', { locale: ar })}
                            </span>
                          </div>
                          {schedule.day_description && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                              <h4 className="font-semibold mb-2">تفاصيل اليوم</h4>
                              <p className="text-muted-foreground whitespace-pre-wrap">{schedule.day_description}</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Organizer */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Link to={`/user/${event.organizer_id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <Avatar className="w-12 h-12 ring-2 ring-background hover:ring-primary/20 transition-all">
                      <AvatarImage src={organizer?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold hover:underline">{organizer?.full_name || "المنظم"}</h3>
                        <Shield className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>منظم فعاليات</span>
                      </div>
                    </div>
                  </Link>
                  <Button variant="outline" onClick={handleContact}>
                    <MessageCircle className="w-4 h-4 ml-2" />
                    تواصل
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>وصف الفعالية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {event.description_ar || event.description}
                </p>
              </CardContent>
            </Card>

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>التقييمات ({reviews.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {reviews.map((review, index) => (
                    <div key={review.id}>
                      <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={review.profiles?.avatar_url} />
                          <AvatarFallback>
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{review.profiles?.full_name}</h4>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-muted-foreground text-sm">{review.comment}</p>
                          <span className="text-xs text-muted-foreground mt-2 inline-block">
                            {format(new Date(review.created_at), 'PP', { locale: ar })}
                          </span>
                        </div>
                      </div>
                      {index < reviews.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>احجز الآن</CardTitle>
                  {event.price && event.price > 0 && (
                    <div className="text-2xl font-bold text-primary">
                      {event.price} ر.س
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.requires_license && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
                      <Shield className="w-5 h-5" />
                      <span className="font-semibold text-sm">رخصة مطلوبة</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      هذه الفعالية تتطلب رخصة صالحة. ستحتاج لإرفاق الرخصة عند الحجز.
                    </p>
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    if (event.status === 'pending' || event.status === 'cancelled' || new Date(event.end_date) < new Date() || event.current_attendees >= event.max_attendees) {
                      return;
                    }
                    navigate('/checkout', {
                      state: {
                        eventId: event.id,
                        eventTitle: event.title_ar || event.title,
                        eventPrice: event.price,
                        availableSeats: event.max_attendees - event.current_attendees
                      }
                    });
                  }}
                  disabled={
                    event.status === 'pending' || 
                    event.status === 'cancelled' || 
                    new Date(event.end_date) < new Date() || 
                    event.current_attendees >= event.max_attendees
                  }
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  {event.status === 'pending' ? 'قيد المراجعة' : 
                   event.status === 'cancelled' ? 'ملغية' :
                   new Date(event.end_date) < new Date() ? 'انتهت' :
                   event.current_attendees >= event.max_attendees ? 'مكتملة' : 'احجز الآن'}
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleViewMap}
                >
                  <MapPin className="w-4 h-4 ml-2" />
                  عرض على الخريطة
                </Button>
              </CardContent>
            </Card>

            {/* Event Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الفعالية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.difficulty_level && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="w-4 h-4" />
                      <span>مستوى الصعوبة</span>
                    </div>
                    <Badge className={getDifficultyColor(event.difficulty_level)}>
                      {event.difficulty_level}
                    </Badge>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span>عدد المشاركين</span>
                  </div>
                  <p className="font-medium">{event.current_attendees || 0} / {event.max_attendees || 0}</p>
                </div>

                {event.cancellation_policy && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Shield className="w-4 h-4" />
                      <span>سياسة الإلغاء</span>
                    </div>
                    <p className="text-sm">{event.cancellation_policy}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {/* Gallery Dialog */}
      {selectedGallery && (
        <EventGalleryDialog
          images={selectedGallery.images}
          initialIndex={selectedGallery.initialIndex}
          onClose={() => setSelectedGallery(null)}
          isRTL={true}
        />
      )}
    </div>
  );
};

export default EventDetails;
