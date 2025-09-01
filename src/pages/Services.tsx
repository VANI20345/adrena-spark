import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Star, Search, Filter, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";

const Services = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - would come from API
  const services = [
    {
      id: "1",
      name: "تأجير معدات التسلق",
      nameAr: "تأجير معدات التسلق",
      description: "معدات تسلق احترافية عالية الجودة",
      descriptionAr: "معدات تسلق احترافية عالية الجودة مع ضمان السلامة الكاملة",
      image: "/api/placeholder/400/250",
      location: "الرياض",
      locationAr: "الرياض - حي النخيل",
      price: 50,
      duration: 480, // 8 hours
      category: "معدات",
      provider: {
        name: "متجر المغامرات",
        rating: 4.8,
        reviewsCount: 156
      },
      featured: true,
      status: "approved"
    },
    {
      id: "2", 
      name: "دليل سياحي للهايكنج",
      nameAr: "دليل سياحي للهايكنج",
      description: "دليل محترف لرحلات الهايكنج",
      descriptionAr: "دليل سياحي محترف مع خبرة 10 سنوات في رحلات الهايكنج والتسلق",
      image: "/api/placeholder/400/250",
      location: "جدة",
      locationAr: "جدة - منطقة الكورنيش",
      price: 150,
      duration: 360, // 6 hours
      category: "إرشاد",
      provider: {
        name: "فريق الإرشاد المتقدم",
        rating: 4.9,
        reviewsCount: 89
      },
      featured: true,
      status: "approved"
    },
    {
      id: "3",
      name: "تصوير الفعاليات",
      nameAr: "تصوير الفعاليات الخارجية",
      description: "تصوير احترافي للمغامرات",
      descriptionAr: "خدمة تصوير احترافية للفعاليات والمغامرات الخارجية مع تحرير مجاني",
      image: "/api/placeholder/400/250",
      location: "الطائف",
      locationAr: "الطائف - منطقة الشفا",
      price: 300,
      duration: 240, // 4 hours
      category: "تصوير",
      provider: {
        name: "استوديو الطبيعة",
        rating: 4.7,
        reviewsCount: 67
      },
      featured: false,
      status: "approved"
    },
    {
      id: "4",
      name: "وجبات صحية للرحلات",
      nameAr: "وجبات صحية للرحلات",
      description: "وجبات مغذية ومناسبة للأنشطة",
      descriptionAr: "وجبات صحية ومتوازنة معدة خصيصاً للأنشطة الخارجية والرحلات الطويلة",
      image: "/api/placeholder/400/250",
      location: "الدمام",
      locationAr: "الدمام - الكورنيش",
      price: 25,
      duration: 60, // 1 hour delivery
      category: "طعام",
      provider: {
        name: "مطبخ المغامرات",
        rating: 4.6,
        reviewsCount: 234
      },
      featured: false,
      status: "approved"
    }
  ];

  const categories = [
    { value: "all", label: "جميع الخدمات" },
    { value: "equipment", label: "معدات" },
    { value: "guide", label: "إرشاد" },
    { value: "photography", label: "تصوير" },
    { value: "food", label: "طعام" },
    { value: "transport", label: "نقل" }
  ];

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ساعة`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            الخدمات المتاحة
          </h1>
          <p className="text-lg text-muted-foreground">
            اكتشف أفضل الخدمات التي تحتاجها لمغامراتك
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-xl p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ابحث عن خدمة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="نوع الخدمة" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="المدينة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المدن</SelectItem>
                <SelectItem value="riyadh">الرياض</SelectItem>
                <SelectItem value="jeddah">جدة</SelectItem>
                <SelectItem value="taif">الطائف</SelectItem>
                <SelectItem value="dammam">الدمام</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="w-4 h-4 ml-2" />
              المزيد من الفلاتر
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            تم العثور على {services.length} خدمة
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow">
              <div className="relative">
                <img 
                  src={service.image} 
                  alt={service.name}
                  className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                />
                {service.featured && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-yellow-500 text-white">
                      مميز
                    </Badge>
                  </div>
                )}
                <div className="absolute bottom-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-sm font-bold text-primary">
                      {service.price} ريال
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {formatDuration(service.duration)}
                    </span>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary smooth-transition">
                    {service.nameAr}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.descriptionAr}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {service.locationAr}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(service.duration)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                      {service.provider.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{service.provider.rating}</span>
                      <span className="text-muted-foreground">({service.provider.reviewsCount})</span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="px-6 pb-6">
                <div className="flex gap-2 w-full">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to={`/service/${service.id}`}>
                      التفاصيل
                    </Link>
                  </Button>
                  <Button className="flex-1">
                    احجز الآن
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-primary/5 rounded-2xl p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            هل تقدم خدمات للمغامرات؟
          </h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            انضم إلى منصتنا وقدم خدماتك لآلاف المغامرين في جميع أنحاء المملكة
          </p>
          <Button asChild size="lg">
            <Link to="/create-service">
              سجل كمقدم خدمة
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;