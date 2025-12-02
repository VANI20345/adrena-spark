import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Service {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  location?: string;
  location_ar?: string;
  image_url?: string;
  price: number;
  duration_minutes?: number;
  featured?: boolean;
  service_type?: string;
  category_id?: string;
  provider?: { full_name?: string };
  rating_summaries?: { average_rating?: number; total_reviews?: number };
}

const ServiceSection = ({ 
  title, 
  services, 
  formatDuration,
  viewAllLink
}: { 
  title: string; 
  services: Service[]; 
  formatDuration: (minutes: number) => string;
  viewAllLink?: string;
}) => {
  const [showAll, setShowAll] = useState(false);
  const displayedServices = showAll ? services : services.slice(0, 3);
  const hasMore = services.length > 3;

  if (services.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <Badge variant="secondary">{services.length}</Badge>
        </div>
        {viewAllLink && (
          <Button variant="outline" asChild>
            <Link to={viewAllLink}>عرض الكل</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedServices.map((service) => (
          <Card key={service.id} className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow">
            <div className="relative">
              <img 
                src={service.image_url || "/placeholder.svg"} 
                alt={service.name_ar || service.name}
                className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
              {service.featured && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-yellow-500 text-white">مميز</Badge>
                </div>
              )}
              <div className="absolute bottom-4 right-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-sm font-bold text-primary">
                    {service.price} ريال
                  </span>
                  {service.duration_minutes && (
                    <span className="text-xs text-muted-foreground block">
                      {formatDuration(service.duration_minutes)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary smooth-transition">
                  {service.name_ar || service.name}
                </h3>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {service.description_ar || service.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div>
                    {service.location_ar || service.location}
                  </div>
                  {service.duration_minutes && (
                    <div>
                      {formatDuration(service.duration_minutes)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {service.provider?.full_name || "مقدم خدمة"}
                  </div>
                  {service.rating_summaries && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {service.rating_summaries.average_rating?.toFixed(1) || "0.0"}
                      </span>
                      <span className="text-muted-foreground">
                        ({service.rating_summaries.total_reviews || 0})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="px-6 pb-6">
              <div className="flex gap-2 w-full">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/service/${service.id}`}>التفاصيل</Link>
                </Button>
                <Button className="flex-1">احجز الآن</Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => setShowAll(!showAll)}
            className="gap-2"
          >
            {showAll ? 'عرض أقل' : `عرض المزيد (${services.length - 3})`}
            {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};

const Services = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");

  // Fetch services from database - show approved services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', 'approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch service categories for filtering
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['service_categories', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .is('parent_id', null)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch cities from database
  const { data: citiesData = [] } = useQuery({
    queryKey: ['cities', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name_ar');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Build categories filter options
  const categories = [
    { value: "all", label: "جميع الخدمات" },
    ...(categoriesData || []).map(cat => ({
      value: cat.id,
      label: cat.name_ar || cat.name
    }))
  ];

  const cities = [
    { value: "all", label: "جميع المدن" },
    ...(citiesData || []).map(city => ({
      value: city.id,
      label: city.name_ar || city.name
    }))
  ];

  // Filter services based on search and filters
  const filteredServices = (services || []).filter(service => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      service.name_ar?.toLowerCase().includes(q) ||
      service.name?.toLowerCase().includes(q) ||
      service.description_ar?.toLowerCase().includes(q) ||
      service.description?.toLowerCase().includes(q) ||
      service.location_ar?.toLowerCase().includes(q) ||
      service.location?.toLowerCase().includes(q);

    const matchesCategory = selectedCategory === "all" || service.category_id === selectedCategory;

    const selectedCityLabel = cities.find(c => c.value === selectedCity)?.label?.toLowerCase();
    const matchesCity =
      selectedCity === "all" ||
      (selectedCityLabel
        ? (service.location_ar?.toLowerCase().includes(selectedCityLabel) ||
           service.location?.toLowerCase().includes(selectedCityLabel))
        : true);

    return Boolean(matchesSearch && matchesCategory && matchesCity);
  });

  // Split services into sections
  const servicesSection = filteredServices.filter(s => 
    s.service_type === 'other' || s.service_type === null || s.service_type === undefined
  );
  const trainingsSection = filteredServices.filter(s => s.service_type === 'training');
  const discountsSection = filteredServices.filter(s => s.service_type === 'discount');

  const formatDuration = (minutes: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ساعة`;
  };

  if (servicesLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-2">جاري تحميل الخدمات...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
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
            <div>
              <Input
                placeholder="ابحث عن خدمة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="المدينة" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.value} value={city.value}>
                    {city.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline">
              المزيد من الفلاتر
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            تم العثور على {filteredServices.length} خدمة
          </p>
        </div>

        {/* Services Sections */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">لا توجد خدمات متاحة</h3>
            <p className="text-muted-foreground">جرب البحث بكلمات أخرى أو تغيير الفلاتر</p>
          </div>
        ) : (
          <div className="space-y-16">
            <ServiceSection 
              title="الخدمات"
              services={servicesSection} 
              formatDuration={formatDuration}
              viewAllLink="/services/other-services"
            />
            
            <ServiceSection 
              title="التدريبات"
              services={trainingsSection} 
              formatDuration={formatDuration}
              viewAllLink="/services/training-services"
            />
            
            <ServiceSection 
              title="العروض والخصومات"
              services={discountsSection} 
              formatDuration={formatDuration}
              viewAllLink="/services/discount-services"
            />
          </div>
        )}

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
