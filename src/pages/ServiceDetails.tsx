import { useState } from "react";
import { useParams } from "react-router-dom";
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
  Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";

const ServiceDetails = () => {
  const { id } = useParams();
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Mock data - would come from API based on id
  const service = {
    id: id,
    name: "تأجير معدات التسلق الاحترافية",
    nameAr: "تأجير معدات التسلق الاحترافية",
    image: "/api/placeholder/800/400",
    location: "الرياض - حي النخيل",
    locationAr: "الرياض - حي النخيل",
    price: 50,
    duration: 480, // 8 hours
    category: "معدات",
    description: "نوفر أفضل معدات التسلق الاحترافية عالية الجودة مع ضمان السلامة الكاملة. جميع معداتنا حديثة ومعتمدة دولياً ويتم فحصها بانتظام لضمان أعلى معايير الأمان.",
    provider: {
      name: "متجر المغامرات الاحترافي",
      avatar: "/api/placeholder/60/60",
      verified: true,
      rating: 4.8,
      reviewsCount: 156,
      servicesCount: 12,
      joinDate: "2020",
      phone: "+966 50 123 4567",
      email: "info@adventure-store.sa"
    },
    rating: 4.8,
    reviewsCount: 156,
    features: [
      "معدات حديثة ومعتمدة دولياً",
      "فحص دوري لضمان السلامة",
      "إرشادات استخدام مفصلة",
      "خدمة عملاء على مدار الساعة",
      "ضمان شامل على جميع المعدات",
      "توصيل مجاني داخل الرياض"
    ],
    included: [
      "حزام أمان احترافي",
      "حبال تسلق عالية الجودة",
      "خوذة واقية",
      "أحذية تسلق",
      "قفازات متخصصة",
      "أدوات ربط وتثبيت"
    ],
    requirements: [
      "هوية شخصية سارية",
      "إيداع مالي قابل للاسترداد",
      "توقيع على اتفاقية الاستخدام",
      "خبرة أساسية في التسلق"
    ],
    policies: [
      "إرجاع المعدات في نفس حالة الاستلام",
      "رسوم إضافية في حالة التلف",
      "إلغاء مجاني قبل 24 ساعة",
      "غسيل وتعقيم بعد كل استخدام"
    ],
    reviews: [
      {
        id: 1,
        user: "خالد أحمد",
        avatar: "/api/placeholder/40/40",
        rating: 5,
        date: "2024-02-20",
        comment: "معدات ممتازة وخدمة احترافية. المعدات كانت في حالة ممتازة والتوصيل كان سريع."
      },
      {
        id: 2,
        user: "سارة محمد",
        avatar: "/api/placeholder/40/40",
        rating: 5,
        date: "2024-02-18",
        comment: "أفضل مكان لتأجير معدات التسلق في الرياض. الأسعار مناسبة والجودة عالية."
      },
      {
        id: 3,
        user: "فهد العتيبي",
        avatar: "/api/placeholder/40/40",
        rating: 4,
        date: "2024-02-15",
        comment: "خدمة جيدة ومعدات موثوقة. سأتعامل معهم مرة أخرى بالتأكيد."
      }
    ]
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ساعة`;
  };

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

        {/* Hero Image */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <img 
            src={service.image} 
            alt={service.nameAr}
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
              {service.category}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{service.rating}</span>
                  <span className="text-muted-foreground">({service.reviewsCount} تقييم)</span>
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {service.nameAr}
              </h1>
              
              <div className="flex flex-wrap gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {service.locationAr}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {formatDuration(service.duration)}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {service.price} ريال
                </div>
              </div>
            </div>

            {/* Provider */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={service.provider.avatar} />
                      <AvatarFallback>
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{service.provider.name}</h3>
                        {service.provider.verified && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {service.provider.rating}
                        </div>
                        <span>{service.provider.servicesCount} خدمة</span>
                        <span>عضو منذ {service.provider.joinDate}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {service.provider.phone}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {service.provider.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline">
                    <MessageCircle className="w-4 h-4 ml-2" />
                    تواصل
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
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {service.description}
                </p>
                
                <div>
                  <h4 className="font-semibold mb-3">مميزات الخدمة:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card>
              <CardHeader>
                <CardTitle>ما هو مشمول؟</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {service.included.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>المتطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{requirement}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Policies */}
            <Card>
              <CardHeader>
                <CardTitle>سياسات الخدمة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.policies.map((policy, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{policy}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>التقييمات ({service.reviewsCount})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {service.reviews.map((review) => (
                  <div key={review.id}>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={review.avatar} />
                        <AvatarFallback>
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{review.user}</h4>
                          <div className="flex items-center gap-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{review.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    </div>
                    {review.id !== service.reviews[service.reviews.length - 1].id && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}
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
                  <span className="text-sm text-muted-foreground">/ {formatDuration(service.duration)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الموقع:</span>
                    <span>{service.locationAr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المدة:</span>
                    <span>{formatDuration(service.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الفئة:</span>
                    <span>{service.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التقييم:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{service.rating}</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <Button className="w-full" size="lg">
                  احجز الآن
                </Button>
                
                <Button variant="outline" className="w-full">
                  <MessageCircle className="w-4 h-4 ml-2" />
                  استفسار
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

      <Footer />
    </div>
  );
};

export default ServiceDetails;