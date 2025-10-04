import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  User
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { eventsService } from "@/services/supabaseServices";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
        navigate('/explore');
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
              <Link to="/explore">العودة للاستكشاف</Link>
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/explore">
              <ChevronLeft className="w-4 h-4 ml-2" />
              العودة للفعاليات
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
              
              <div className="flex flex-wrap gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {event.location_ar || event.location}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {format(new Date(event.start_date), 'PPP', { locale: ar })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {format(new Date(event.start_date), 'p', { locale: ar })} - {format(new Date(event.end_date), 'p', { locale: ar })}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {event.current_attendees || 0}/{event.max_attendees || 0} مشارك
                </div>
              </div>
            </div>

            {/* Organizer */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={organizer?.avatar_url} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{organizer?.full_name || "المنظم"}</h3>
                        <Shield className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>منظم فعاليات</span>
                      </div>
                    </div>
                  </div>
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
                            <h4 className="font-medium">{review.profiles?.full_name || "مستخدم"}</h4>
                            <div className="flex items-center gap-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(review.created_at), 'PPP', { locale: ar })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                      {index < reviews.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">{event.price || 0}</span>
                  <span className="text-muted-foreground">ريال</span>
                  <span className="text-sm text-muted-foreground">/ شخص</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التاريخ:</span>
                    <span>{format(new Date(event.start_date), 'PPP', { locale: ar })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الوقت:</span>
                    <span>{format(new Date(event.start_date), 'p', { locale: ar })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المقاعد المتبقية:</span>
                    <span className="font-medium text-primary">
                      {(event.max_attendees || 0) - (event.current_attendees || 0)}
                    </span>
                  </div>
                </div>
                
                <Separator />
                
                <Button 
                  className="w-full" 
                  size="lg"
                  asChild
                  disabled={event.status !== 'active'}
                >
                  <Link 
                    to="/checkout" 
                    state={{
                      eventId: event.id,
                      eventTitle: event.title_ar || event.title,
                      eventPrice: event.price || 0,
                      availableSeats: (event.max_attendees || 0) - (event.current_attendees || 0)
                    }}
                  >
                    {event.status === 'active' ? 'احجز الآن' : 
                     event.status === 'draft' || event.status === 'pending' ? 'في انتظار الموافقة' :
                     'غير متاح للحجز'}
                  </Link>
                </Button>
                
                {event.cancellation_policy && (
                  <p className="text-xs text-center text-muted-foreground">
                    {event.cancellation_policy}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الموقع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-1" />
                    <span className="text-sm">{event.location_ar || event.location}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-primary mt-1" />
                    <span className="text-sm">{format(new Date(event.start_date), 'PPPp', { locale: ar })}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleViewMap}>
                  عرض على الخريطة
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetails;