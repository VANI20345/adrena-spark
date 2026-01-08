import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguageContext } from "@/contexts/LanguageContext";
import GuestBlurOverlay from "@/components/Auth/GuestBlurOverlay";
import { ServiceSearchBar } from "@/components/Services/ServiceSearchBar";
import { ServiceFilters, getDefaultServiceFilters } from "@/components/Services/ServiceAdvancedFilters";

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
  original_price?: number;
  discount_percentage?: number;
  duration_minutes?: number;
  featured?: boolean;
  service_type?: string;
  category_id?: string;
  city_id?: string;
  provider?: { full_name?: string };
  rating_summaries?: { average_rating?: number; total_reviews?: number };
}

const ServiceSection = ({ 
  title, 
  services, 
  formatDuration,
  viewAllLink,
  emptyMessage,
  isRTL,
  t
}: { 
  title: string; 
  services: Service[]; 
  formatDuration: (minutes: number) => string;
  viewAllLink?: string;
  emptyMessage?: string;
  isRTL: boolean;
  t: (key: string) => string;
}) => {
  const [showAll, setShowAll] = useState(false);
  const displayedServices = showAll ? services : services.slice(0, 3);
  const hasMore = services.length > 3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <Badge variant="secondary">{services.length}</Badge>
        </div>
        {viewAllLink && (
          <Button variant="outline" asChild>
            <Link to={viewAllLink}>{isRTL ? 'عرض الكل' : 'View All'}</Link>
          </Button>
        )}
      </div>

      {services.length === 0 ? (
        <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedServices.map((service) => (
              <Card key={service.id} className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow">
                <div className="relative">
                  <img 
                    src={service.image_url || "/placeholder.svg"} 
                    alt={isRTL ? service.name_ar : service.name}
                    className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  {service.featured && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-yellow-500 text-white">{isRTL ? 'مميز' : 'Featured'}</Badge>
                    </div>
                  )}
                  {service.discount_percentage && service.discount_percentage > 0 && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-500 text-white flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {service.discount_percentage}% {isRTL ? 'خصم' : 'OFF'}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                      {service.original_price && service.original_price > service.price ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-muted-foreground line-through">
                            {service.original_price} {isRTL ? 'ريال' : 'SAR'}
                          </span>
                          <span className="text-sm font-bold text-red-500">
                            {service.price} {isRTL ? 'ريال' : 'SAR'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {service.price === 0 ? (isRTL ? 'مجاني' : 'Free') : `${service.price} ${isRTL ? 'ريال' : 'SAR'}`}
                        </span>
                      )}
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
                      {isRTL ? (service.name_ar || service.name) : (service.name || service.name_ar)}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {isRTL ? (service.description_ar || service.description) : (service.description || service.description_ar)}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        {isRTL ? (service.location_ar || service.location) : (service.location || service.location_ar)}
                      </div>
                      {service.duration_minutes && (
                        <div>
                          {formatDuration(service.duration_minutes)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        {service.provider?.full_name || (isRTL ? "مقدم خدمة" : "Service Provider")}
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
                      <Link to={`/service/${service.id}`}>{isRTL ? 'التفاصيل' : 'Details'}</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link to={`/services/${service.id}/booking`}>{isRTL ? 'احجز الآن' : 'Book Now'}</Link>
                    </Button>
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
                {showAll 
                  ? (isRTL ? 'عرض أقل' : 'Show Less') 
                  : (isRTL ? `عرض المزيد (${services.length - 3})` : `Show More (${services.length - 3})`)}
                {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Services = () => {
  const { user } = useAuth();
  const { language, t } = useLanguageContext();
  const isRTL = language === 'ar';
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ServiceFilters>(getDefaultServiceFilters());

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

  // Fetch cities for filtering
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

  // Check if any filters are active
  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.cities.length > 0 ||
    filters.serviceTypes.length > 0 ||
    filters.priceRange[0] !== 0 ||
    filters.priceRange[1] !== 5000;

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

    const matchesCategory = filters.categories.length === 0 || 
      (service.category_id && filters.categories.includes(service.category_id));

    // Match service type
    const matchesServiceType = filters.serviceTypes.length === 0 || 
      filters.serviceTypes.includes(service.service_type || 'other');

    // Match price range
    const matchesPriceRange = service.price >= filters.priceRange[0] && 
      service.price <= filters.priceRange[1];

    // Match city by checking if the city name or ID is in the filters
    let matchesCity = filters.cities.length === 0;
    if (!matchesCity && filters.cities.length > 0) {
      // Check by city_id first
      if (service.city_id && filters.cities.includes(service.city_id)) {
        matchesCity = true;
      } else {
        // Fallback to checking by location text
        const selectedCityNames = filters.cities.map(cityId => {
          const city = citiesData.find(c => c.id === cityId);
          return city ? [city.name?.toLowerCase(), city.name_ar?.toLowerCase()] : [];
        }).flat().filter(Boolean);
        
        matchesCity = selectedCityNames.some(cityName => 
          service.location_ar?.toLowerCase().includes(cityName) ||
          service.location?.toLowerCase().includes(cityName)
        );
      }
    }

    return Boolean(matchesSearch && matchesCategory && matchesCity && matchesServiceType && matchesPriceRange);
  });

  // Split services into sections based on service_type
  const servicesSection = filteredServices.filter(s => 
    !s.service_type || s.service_type === 'other' || s.service_type === null || s.service_type === undefined
  );
  const trainingsSection = filteredServices.filter(s => s.service_type === 'training');
  const discountsSection = filteredServices.filter(s => 
    s.service_type === 'discount' || (s.discount_percentage && s.discount_percentage > 0)
  );

  const formatDuration = (minutes: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes} ${isRTL ? 'دقيقة' : 'min'}`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ${isRTL ? 'ساعة' : 'hr'}`;
  };

  if (servicesLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className={`${isRTL ? 'mr-2' : 'ml-2'}`}>
              {isRTL ? 'جاري تحميل الخدمات...' : 'Loading services...'}
            </span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <GuestBlurOverlay
        isGuest={!user}
        title={isRTL ? 'يجب أن تسجل الدخول لإكمال مغامرتك' : 'Sign in to continue your adventure'}
        subtitle={isRTL ? 'سجل دخولك للوصول إلى جميع الخدمات وإتمام الحجوزات' : 'Sign in to access all services and complete bookings'}
        buttonText={isRTL ? 'تسجيل الدخول' : 'Sign in'}
      >
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? 'الخدمات المتاحة' : 'Available Services'}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRTL ? 'اكتشف أفضل الخدمات التي تحتاجها لمغامراتك' : 'Discover the best services for your adventures'}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8">
            <ServiceSearchBar
              searchTerm={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Results */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              {isRTL 
                ? `تم العثور على ${filteredServices.length} خدمة`
                : `Found ${filteredServices.length} services`}
            </p>
          </div>

          {/* Services Sections - Always show all 3 */}
          <div className="space-y-16">
            <ServiceSection 
              title={isRTL ? 'الخدمات' : 'Services'}
              services={servicesSection} 
              formatDuration={formatDuration}
              viewAllLink="/services/other-services"
              emptyMessage={isRTL ? 'لا توجد خدمات متاحة حالياً' : 'No services available'}
              isRTL={isRTL}
              t={t}
            />
            
            <ServiceSection 
              title={isRTL ? 'التدريبات' : 'Training'}
              services={trainingsSection} 
              formatDuration={formatDuration}
              viewAllLink="/services/training-services"
              emptyMessage={isRTL ? 'لا توجد تدريبات متاحة حالياً' : 'No training available'}
              isRTL={isRTL}
              t={t}
            />
            
            <ServiceSection 
              title={isRTL ? 'العروض والخصومات' : 'Offers & Discounts'}
              services={discountsSection} 
              formatDuration={formatDuration}
              viewAllLink="/services/discount-services"
              emptyMessage={isRTL ? 'لا توجد خصومات متاحة حالياً' : 'No discounts available'}
              isRTL={isRTL}
              t={t}
            />
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center bg-primary/5 rounded-2xl p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {isRTL ? 'هل تقدم خدمات للمغامرات؟' : 'Do you offer adventure services?'}
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              {isRTL 
                ? 'انضم إلى منصتنا وقدم خدماتك لآلاف المغامرين في جميع أنحاء المملكة'
                : 'Join our platform and offer your services to thousands of adventurers across the Kingdom'}
            </p>
            <Button asChild size="lg">
              <Link to="/create-service">
                {isRTL ? 'سجل كمقدم خدمة' : 'Register as Provider'}
              </Link>
            </Button>
          </div>
        </main>
      </GuestBlurOverlay>

      <Footer />
    </div>
  );
};

export default Services;
