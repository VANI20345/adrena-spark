import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package } from "lucide-react";

interface Service {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  location?: string;
  location_ar?: string;
  image_url?: string;
  thumbnail_url?: string;
  price: number;
  duration_minutes?: number;
  service_type?: string;
  category_id?: string;
  provider?: { full_name?: string };
  rating_summaries?: { average_rating?: number; total_reviews?: number };
}

const OtherServicesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['other-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'approved')
        .or('service_type.eq.other,service_type.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

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
  });

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
  });

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

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ساعة`;
  };

  const filteredServices = services.filter(service => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      service.name_ar?.toLowerCase().includes(q) ||
      service.name?.toLowerCase().includes(q) ||
      service.description_ar?.toLowerCase().includes(q);

    const matchesCategory = selectedCategory === "all" || service.category_id === selectedCategory;

    const selectedCityLabel = cities.find(c => c.value === selectedCity)?.label?.toLowerCase();
    const matchesCity =
      selectedCity === "all" ||
      (selectedCityLabel
        ? (service.location_ar?.toLowerCase().includes(selectedCityLabel) ||
           service.location?.toLowerCase().includes(selectedCityLabel))
        : true);

    return matchesSearch && matchesCategory && matchesCity;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <div className="mb-8">
          <Link to="/services" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للخدمات
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              الخدمات الأخرى
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            تصفح جميع الخدمات المتاحة
          </p>
        </div>

        <div className="bg-card border rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
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
          </div>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground">
            تم العثور على {filteredServices.length} خدمة
          </p>
        </div>

        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">لا توجد خدمات متاحة</h3>
            <p className="text-muted-foreground">جرب البحث بكلمات أخرى أو تغيير الفلاتر</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <Card key={service.id} className="overflow-hidden group hover:shadow-lg smooth-transition">
                <div className="relative">
                  <img 
                    src={service.thumbnail_url || service.image_url || "/placeholder.svg"} 
                    alt={service.name_ar || service.name}
                    className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                  />
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
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OtherServicesPage;
