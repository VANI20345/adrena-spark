import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  MapPin, 
  Star, 
  Clock, 
  DollarSign,
  Share2,
  Heart,
  Shield,
  MessageCircle,
  ChevronLeft,
  User,
  CheckCircle,
  Phone,
  Mail,
  GraduationCap
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { reviewsService } from "@/services/supabaseServices";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageViewerDialog } from "@/components/Groups/ImageViewerDialog";
import { CreateTicketDialog } from "@/components/Tickets/CreateTicketDialog";

interface Service {
  id: string;
  provider_id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  category_id: string | null;
  location: string | null;
  location_ar: string | null;
  price: number;
  original_price?: number | null;
  discount_percentage?: number | null;
  duration_minutes: number | null;
  status: string;
  end_date?: string | null;
  max_capacity: number;
  current_capacity: number;
  image_url: string | null;
  thumbnail_url?: string | null;
  detail_images?: string[] | null;
  service_type?: string | null;
  provided_services?: string[] | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  provider?: {
    full_name: string;
    phone: string;
    avatar_url: string;
  };
}

interface Review {
  id: string;
  user_id: string;
  service_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  const isTrainingService = service?.service_type === 'training';

  useEffect(() => {
    if (id) {
      fetchServiceDetails();
      fetchServiceReviews();
    }
  }, [id]);

  const fetchServiceDetails = async () => {
    if (!id) return;

    try {
      // Fetch service with provider profile details
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          provider:profiles!provider_id(full_name, avatar_url, phone),
          category:service_categories(name, name_ar)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setService(data as unknown as Service);
    } catch (error) {
      console.error('Error fetching service details:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب تفاصيل الخدمة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceReviews = async () => {
    if (!id) return;

    try {
      const { data, error } = await reviewsService.getByServiceId(id);
      if (error) throw error;
      
      const reviewsData = (data as unknown as Review[]) || [];
      setReviews(reviewsData);
      
      // Calculate average rating
      if (reviewsData.length > 0) {
        const avgRating = reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length;
        setAverageRating(avgRating);
      }
    } catch (error) {
      console.error('Error fetching service reviews:', error);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ساعة`;
  };

  const handleBookService = async () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول أولاً لحجز الخدمة",
        variant: "destructive",
      });
      return;
    }

    if (!service) return;

    // Navigate to booking page
    navigate(`/services/${service.id}/booking`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-xl">جاري التحميل...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-xl text-muted-foreground">الخدمة غير موجودة</div>
            <Button asChild className="mt-4">
              <Link to="/services">العودة للخدمات</Link>
            </Button>
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
        {/* Back Button */}
        <div className="mb-6">
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/services">
              <ChevronLeft className="w-4 h-4 ml-2" />
              العودة للخدمات
            </Link>
          </Button>
        </div>

        {/* Hero Image & Gallery */}
        <div className="space-y-4 mb-8">
          <div className="relative rounded-2xl overflow-hidden">
            <img 
              src={service.thumbnail_url || service.image_url || service.detail_images?.[0] || '/placeholder.svg'} 
              alt={service.name_ar || service.name}
              className="w-full h-96 object-cover"
            />
          <div className="absolute top-6 right-6 flex gap-3">
            <Button 
              size="icon" 
              variant="secondary" 
              className="bg-white/90 hover:bg-white"
              onClick={() => setIsBookmarked(!isBookmarked)}
            >
              <Heart className={`w-5 h-5 ${isBookmarked ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button size="icon" variant="secondary" className="bg-white/90 hover:bg-white">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
            <div className="absolute bottom-6 right-6">
              <Badge className="bg-primary text-white text-lg px-4 py-2">
                خدمة
              </Badge>
            </div>
          </div>

          {/* Photo Gallery - Show max 4 images with lightbox */}
          {service.detail_images && service.detail_images.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {service.detail_images.slice(0, 4).map((image, index) => (
                <div 
                  key={index} 
                  className="relative rounded-lg overflow-hidden aspect-square cursor-pointer"
                  onClick={() => {
                    setGalleryIndex(index);
                    setGalleryOpen(true);
                  }}
                >
                  <img 
                    src={image} 
                    alt={`${service.name_ar || service.name} - صورة ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                  {index === 3 && service.detail_images!.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        +{service.detail_images!.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Image Viewer Dialog */}
          {service.detail_images && service.detail_images.length > 0 && (
            <ImageViewerDialog
              images={service.detail_images}
              currentIndex={galleryIndex}
              open={galleryOpen}
              onClose={() => setGalleryOpen(false)}
              caption={service.name_ar || service.name}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {averageRating > 0 ? averageRating.toFixed(1) : 'لا توجد تقييمات'}
                  </span>
                  <span className="text-muted-foreground">({reviews.length} تقييم)</span>
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {service.name_ar || service.name}
              </h1>
              
              <div className="flex flex-wrap gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {service.location_ar || service.location || 'غير محدد'}
                </div>
                {service.duration_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {formatDuration(service.duration_minutes)}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {service.original_price && service.discount_percentage ? (
                    <div className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground text-sm">{service.original_price} ريال</span>
                      <Badge variant="destructive" className="text-xs">-{service.discount_percentage}%</Badge>
                      <span className="text-lg font-bold text-primary">{service.price} ريال</span>
                    </div>
                  ) : (
                    <span>{service.price > 0 ? `${service.price} ريال` : 'مجاني'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Provider */}
            <Card>
              <CardHeader>
                <CardTitle>مقدم الخدمة</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link to={`/user/${service.provider_id}`} className="shrink-0">
                      <Avatar className="w-16 h-16 ring-2 ring-background hover:ring-primary/20 transition-all cursor-pointer">
                        <AvatarImage src={service.provider?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="w-8 h-8" />
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/user/${service.provider_id}`} className="text-lg font-semibold hover:underline">
                          {service.provider?.full_name || 'مقدم الخدمة'}
                        </Link>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${
                                star <= averageRating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                          <span className="mr-1 font-medium">
                            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                          </span>
                          <span className="text-muted-foreground">
                            ({reviews.length} {reviews.length === 1 ? 'تقييم' : 'تقييمات'})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Badge variant="secondary" className="text-xs">خدمة متميزة</Badge>
                        <Badge variant="secondary" className="text-xs">مقدم خدمة معتمد</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {/* Removed WhatsApp - using ticket system instead */}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (service?.provider_id) {
                        navigate(`/messages?userId=${service.provider_id}`);
                      }
                    }}
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    تواصل مع مقدم الخدمة
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>وصف الخدمة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap break-words">
                  {service.description_ar || service.description || 'لا يوجد وصف متاح لهذه الخدمة.'}
                </p>
                
                {service.provided_services && service.provided_services.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">الخدمات المقدمة:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {service.provided_services.map((providedService: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{providedService}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الخدمة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">معلومات أساسية</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الحالة:</span>
                          <span>{service.status === 'approved' ? 'نشط' : 'غير نشط'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                          <span>{new Date(service.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                        {service.featured && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">خدمة مميزة:</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {service.service_type === 'discount' && (
                      <div className="p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          تفاصيل الخصم
                        </h4>
                        <div className="space-y-2">
                          {service.original_price && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">السعر الأصلي:</span>
                              <span className="text-sm line-through">{service.original_price} ر.س</span>
                            </div>
                          )}
                          {service.discount_percentage && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">نسبة الخصم:</span>
                              <Badge variant="destructive">-{service.discount_percentage}%</Badge>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                            <span>السعر النهائي:</span>
                            <span className="text-primary">{service.price} ر.س</span>
                          </div>
                          {service.original_price && (
                            <div className="flex justify-between items-center text-sm text-green-600">
                              <span>توفر:</span>
                              <span>{(service.original_price - service.price).toFixed(2)} ر.س</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>التقييمات ({reviews.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {reviews.length > 0 ? (
                  reviews.map((review, index) => (
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
                            <h4 className="font-medium">
                              {review.profiles?.full_name || 'مستخدم مجهول'}
                            </h4>
                            <div className="flex items-center gap-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                      {index !== reviews.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد تقييمات لهذه الخدمة بعد
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">{service.price}</span>
                  <span className="text-muted-foreground">ريال</span>
                  {service.duration_minutes && (
                    <span className="text-sm text-muted-foreground">/ {formatDuration(service.duration_minutes)}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الموقع:</span>
                    <span>{service.location_ar || service.location || 'غير محدد'}</span>
                  </div>
                  {service.duration_minutes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المدة:</span>
                      <span>{formatDuration(service.duration_minutes)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الفئة:</span>
                    <span>خدمة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التقييم:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{averageRating > 0 ? averageRating.toFixed(1) : 'لا يوجد'}</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleBookService}
                  disabled={
                    service.status === 'pending' || 
                    service.status === 'cancelled' ||
                    ((service.service_type === 'training' || service.service_type === 'discount') && service.end_date && new Date(service.end_date) < new Date()) ||
                    service.current_capacity >= service.max_capacity
                  }
                >
                  {service.status === 'pending' ? 'قيد المراجعة' : 
                   service.status === 'cancelled' ? 'ملغية' :
                   ((service.service_type === 'training' || service.service_type === 'discount') && service.end_date && new Date(service.end_date) < new Date()) ? 'انتهت' :
                   service.current_capacity >= service.max_capacity ? 'مكتملة' : 'احجز الآن'}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  إلغاء مجاني قبل 24 ساعة من الموعد
                </p>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">متاح الآن</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">توصيل مجاني</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ضمان شامل</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">دعم 24/7</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Ticket Dialog for Training Services */}
      <CreateTicketDialog
        open={showTicketDialog}
        onClose={() => setShowTicketDialog(false)}
        ticketType="training_inquiry"
        entityId={id}
        entityType="service"
        targetUserId={service?.provider_id}
        entityName={service?.name_ar || service?.name}
      />

      <Footer />
    </div>
  );
};

export default ServiceDetails;