import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/empty-state';
import Autoplay from "embla-carousel-autoplay";
import { 
  Mountain, 
  Waves, 
  Tent, 
  Bike, 
  TreePine, 
  Zap,
  Car,
  Wind,
  Compass,
  Trophy,
  Palmtree,
  Plane,
  Footprints,
  Flame,
  Camera,
  Target,
  Anchor,
  Snowflake,
  Sun,
  Leaf
} from 'lucide-react';
import { categoriesService, statisticsService, eventsService } from '@/services/supabaseServices';
import { supabase } from '@/integrations/supabase/client';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// Import category images
import mountainImg from '@/assets/categories/mountain.jpg';
import wavesImg from '@/assets/categories/waves.jpg';
import campingImg from '@/assets/categories/camping.jpg';
import bikingImg from '@/assets/categories/biking.jpg';
import desertImg from '@/assets/categories/desert.jpg';
import beachImg from '@/assets/categories/beach.jpg';
import snowImg from '@/assets/categories/snow.jpg';
import hikingImg from '@/assets/categories/hiking.jpg';
import forestImg from '@/assets/categories/forest.jpg';
import offroadImg from '@/assets/categories/offroad.jpg';
import airsportsImg from '@/assets/categories/airsports.jpg';
import kayakingImg from '@/assets/categories/kayaking.jpg';
import climbingImg from '@/assets/categories/climbing.jpg';
import safariImg from '@/assets/categories/safari.jpg';
import caveImg from '@/assets/categories/cave.jpg';
import archeryImg from '@/assets/categories/archery.jpg';

// Icon mapping with proper adventure icons
export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mountain,
  Waves,
  Tent,
  Bike,
  TreePine,
  Zap,
  Car,
  Wind,
  Compass,
  Trophy,
  Palmtree,
  Plane,
  Footprints,
  Flame,
  Camera,
  Target,
  Anchor,
  Snowflake,
  Sun,
  Leaf
};

// Default icon assignment per category type
const getCategoryIcon = (categoryName: string): React.ComponentType<{ className?: string }> => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('جبل') || name.includes('تسلق')) return Mountain;
  if (name.includes('بحر') || name.includes('غوص') || name.includes('سباحة')) return Waves;
  if (name.includes('تخييم') || name.includes('خيمة')) return Tent;
  if (name.includes('دراج') || name.includes('سيكل')) return Bike;
  if (name.includes('غاب') || name.includes('طبيعة')) return TreePine;
  if (name.includes('سرع') || name.includes('قيادة')) return Zap;
  if (name.includes('سيارة') || name.includes('طرق')) return Car;
  if (name.includes('رياح') || name.includes('طيران')) return Wind;
  if (name.includes('استكشاف') || name.includes('مغامرة')) return Compass;
  if (name.includes('صحراء') || name.includes('رمل')) return Sun;
  if (name.includes('ثلج') || name.includes('تزلج')) return Snowflake;
  if (name.includes('شاطئ') || name.includes('نخل')) return Palmtree;
  if (name.includes('طيران') || name.includes('سفر')) return Plane;
  if (name.includes('مشي') || name.includes('رحلة')) return Footprints;
  if (name.includes('نار') || name.includes('شواء')) return Flame;
  if (name.includes('تصوير') || name.includes('صور')) return Camera;
  if (name.includes('رماية') || name.includes('هدف')) return Target;
  if (name.includes('قارب') || name.includes('بحرية')) return Anchor;
  if (name.includes('زراع') || name.includes('أخضر')) return Leaf;
  
  return Trophy;
};

// Get category color based on category name
const getCategoryColor = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('جبل') || name.includes('تسلق')) return 'bg-slate-500';
  if (name.includes('بحر') || name.includes('غوص') || name.includes('سباحة')) return 'bg-blue-500';
  if (name.includes('تخييم') || name.includes('خيمة')) return 'bg-green-600';
  if (name.includes('دراج') || name.includes('سيكل')) return 'bg-orange-500';
  if (name.includes('غاب') || name.includes('طبيعة')) return 'bg-emerald-600';
  if (name.includes('سرع') || name.includes('قيادة')) return 'bg-yellow-500';
  if (name.includes('سيارة') || name.includes('طرق')) return 'bg-gray-600';
  if (name.includes('رياح') || name.includes('طيران')) return 'bg-sky-400';
  if (name.includes('استكشاف') || name.includes('مغامرة')) return 'bg-purple-500';
  if (name.includes('صحراء') || name.includes('رمل')) return 'bg-amber-500';
  if (name.includes('ثلج') || name.includes('تزلج')) return 'bg-cyan-400';
  if (name.includes('شاطئ') || name.includes('نخل')) return 'bg-teal-500';
  if (name.includes('طيران') || name.includes('سفر')) return 'bg-indigo-500';
  if (name.includes('مشي') || name.includes('رحلة')) return 'bg-lime-600';
  if (name.includes('نار') || name.includes('شواء')) return 'bg-red-500';
  if (name.includes('تصوير') || name.includes('صور')) return 'bg-pink-500';
  if (name.includes('رماية') || name.includes('هدف')) return 'bg-rose-600';
  if (name.includes('قارب') || name.includes('بحرية')) return 'bg-blue-600';
  if (name.includes('زراع') || name.includes('أخضر')) return 'bg-green-500';
  
  return 'bg-primary';
};

// Get category image based on category name
const getCategoryImage = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  // Climbing & Mountains
  if (name.includes('جبل') || name.includes('تسلق') || name.includes('صعود')) return climbingImg;
  
  // Water activities
  if (name.includes('بحر') || name.includes('غوص') || name.includes('سباحة') || name.includes('ماء')) return wavesImg;
  if (name.includes('قارب') || name.includes('بحرية') || name.includes('تجديف') || name.includes('كاياك')) return kayakingImg;
  
  // Camping
  if (name.includes('تخييم') || name.includes('خيمة') || name.includes('مخيم')) return campingImg;
  
  // Biking
  if (name.includes('دراج') || name.includes('سيكل') || name.includes('هوائي')) return bikingImg;
  
  // Desert & Safari
  if (name.includes('صحراء') || name.includes('رمل') || name.includes('كثبان')) return desertImg;
  if (name.includes('سفاري') || name.includes('حيوانات') || name.includes('برية')) return safariImg;
  
  // Snow & Winter
  if (name.includes('ثلج') || name.includes('تزلج') || name.includes('شتاء')) return snowImg;
  
  // Beach
  if (name.includes('شاطئ') || name.includes('نخل') || name.includes('ساحل')) return beachImg;
  
  // Hiking & Walking
  if (name.includes('مشي') || name.includes('رحلة') || name.includes('تنزه') || name.includes('سير')) return hikingImg;
  
  // Forest & Nature
  if (name.includes('غاب') || name.includes('طبيعة') || name.includes('أشجار') || name.includes('حرجي')) return forestImg;
  
  // Off-road & Racing
  if (name.includes('سرع') || name.includes('قيادة') || name.includes('سباق') || name.includes('رالي')) return offroadImg;
  if (name.includes('سيارة') || name.includes('طرق') || name.includes('دفع رباعي')) return offroadImg;
  
  // Air sports
  if (name.includes('رياح') || name.includes('طيران') || name.includes('هواء') || name.includes('شراع')) return airsportsImg;
  if (name.includes('مظل') || name.includes('قفز') || name.includes('طائر')) return airsportsImg;
  
  // Exploration & Adventure
  if (name.includes('استكشاف') || name.includes('مغامرة') || name.includes('اكتشاف')) return safariImg;
  
  // Fire & BBQ
  if (name.includes('نار') || name.includes('شواء') || name.includes('طبخ')) return campingImg;
  
  // Archery & Target
  if (name.includes('رماية') || name.includes('هدف') || name.includes('نشاب') || name.includes('قوس')) return archeryImg;
  
  // Cave exploration
  if (name.includes('كهف') || name.includes('مغار') || name.includes('كهوف')) return caveImg;
  
  // Default fallback
  return mountainImg;
};

interface Category {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  icon_name?: string;
  color_start?: string;
  color_end?: string;
  event_count: number;
}

interface Statistic {
  id: string;
  stat_key: string;
  stat_value_ar: string;
  description_ar?: string;
  icon_name?: string;
  display_order: number;
}

const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [statistics, setStatistics] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const autoplayPlugin = useRef(
    Autoplay({ 
      delay: 3500, 
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      playOnInit: true 
    })
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesResponse, statisticsResponse, eventsResponse] = await Promise.all([
        categoriesService.getAll(),
        statisticsService.getAll(),
        eventsService.getAll()
      ]);

      if (categoriesResponse.error) throw categoriesResponse.error;
      if (statisticsResponse.error) throw statisticsResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;

      // Count total events per category (not just available ones)
      const allEvents = eventsResponse.data || [];
      const categoriesWithCounts = (categoriesResponse.data || []).map(category => {
        const totalEventCount = allEvents.filter(event => event.category_id === category.id).length;
        return {
          ...category,
          event_count: totalEventCount
        };
      });

      console.log('📊 Total categories fetched:', categoriesWithCounts.length);
      console.log('📋 Categories:', categoriesWithCounts.map(c => c.name_ar));
      setCategories(categoriesWithCounts);
      setStatistics(statisticsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time category changes
    const channel = supabase
      .channel('category-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getIconComponent = (iconName?: string, categoryName?: string): React.ComponentType<{ className?: string }> => {
    // First check if custom icon name exists in iconMap
    if (iconName && iconMap[iconName]) {
      return iconMap[iconName];
    }
    // Then check category name for smart icon selection
    if (categoryName) {
      return getCategoryIcon(categoryName);
    }
    // Default fallback
    return Trophy;
  };

  const getGradientClass = (colorStart?: string, colorEnd?: string) => {
    // Ensure colors are valid or return default
    if (!colorStart || !colorEnd) {
      return 'bg-gradient-to-r from-primary/80 to-primary';
    }
    
    // Return the gradient using the color values directly
    return `bg-gradient-to-r from-${colorStart}-500 to-${colorEnd}-600`;
  };

  if (loading) {
    return (
      <div className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              تصنيفات المغامرات
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              اكتشف مجموعة متنوعة من الأنشطة والمغامرات التي تناسب جميع المستويات والاهتمامات
            </p>
          </div>
          <LoadingState 
            title="جاري تحميل التصنيفات..." 
            description="يرجى الانتظار بينما نقوم بتحميل جميع تصنيفات المغامرات المتاحة"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              تصنيفات المغامرات
            </h2>
          </div>
          <ErrorState 
            title="خطأ في تحميل التصنيفات"
            description={error}
            onRetry={fetchData}
          />
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              تصنيفات المغامرات
            </h2>
          </div>
          <EmptyState
            icon={Trophy}
            title="لا توجد تصنيفات متاحة حالياً"
            description="لم نتمكن من العثور على أي تصنيفات للمغامرات في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقاً أو تصفح الفعاليات مباشرة."
            actionLabel="تصفح الفعاليات"
            onAction={() => window.location.href = '/my-events'}
            showRetry
            onRetry={fetchData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="section-accent-bar" />
            <h2 className="text-2xl md:text-3xl font-bold">
              تصنيفات المغامرات
            </h2>
            <span className="section-accent-bar" />
          </div>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            اكتشف مجموعة متنوعة من الأنشطة والمغامرات التي تناسب جميع المستويات والاهتمامات
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-12 justify-items-center max-w-5xl mx-auto">
          {categories.map((category) => {
            const IconComponent = getIconComponent(category.icon_name, category.name_ar);
            const colorClass = getCategoryColor(category.name_ar);
            
            return (
              <Link 
                key={category.id} 
                to={`/explore?category=${category.id}`}
                className="group"
              >
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg hover:bg-muted/50 smooth-transition">
                  <div className={`w-16 h-16 rounded-full ${colorClass} flex items-center justify-center group-hover:scale-110 smooth-transition shadow-md`}>
                    {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
                  </div>
                  <h3 className="font-medium text-sm text-center group-hover:text-primary smooth-transition line-clamp-2">
                    {category.name_ar}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>


        {/* View All Button */}
        <div className="text-center mt-12">
          <Button size="lg" variant="outline" className="dark:bg-primary/20 dark:border-primary/40 dark:hover:bg-primary/30 dark:text-primary-foreground" asChild>
            <Link to="/explore">
              <Trophy className="w-4 h-4 ml-2" />
              عرض جميع التصنيفات
            </Link>
          </Button>
        </div>

        {/* Categories Carousel Slideshow */}
        {categories.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center mb-8">استكشف جميع التصنيفات</h3>
            <Carousel
              key={`cats-${categories.length}`}
              opts={{
                align: "start",
                loop: true,
                slidesToScroll: 1,
                containScroll: "trimSnaps",
                dragFree: false,
              }}
              plugins={[autoplayPlugin.current]}
              className="w-full"
              onMouseEnter={() => autoplayPlugin.current.stop()}
              onMouseLeave={() => autoplayPlugin.current.reset()}
            >
              <CarouselContent className="" >
                {categories.map((category) => {
                  const categoryImage = getCategoryImage(category.name_ar);
                  const IconComponent = getIconComponent(category.icon_name, category.name_ar);
                  
                  return (
                    <CarouselItem key={category.id} className="basis-auto pl-4 w-80 md:w-96">
                      <Link to={`/explore?category=${category.id}`} className="block h-full">
                        <Card className="group overflow-hidden hover:shadow-xl smooth-transition h-full">
                          <div className="relative h-64">
                            <img 
                              src={categoryImage} 
                              alt={category.name_ar}
                              className="w-full h-full object-cover group-hover:scale-110 smooth-transition"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                            
                            <div className="absolute top-4 right-4">
                              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 shadow-lg">
                                {IconComponent && <IconComponent className="w-8 h-8 text-white drop-shadow-lg" />}
                              </div>
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                              <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">{category.name_ar}</h3>
                              <p className="text-sm opacity-90 line-clamp-2 mb-3 drop-shadow-md">
                                {category.description_ar || 'استكشف أفضل الفعاليات'}
                              </p>
                              <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                                {category.event_count} فعالية
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="left-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background" />
              <CarouselNext className="right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background" />
            </Carousel>
          </div>
        )}

        {/* Stats Section */}
        {statistics.length > 0 && (
          <div className="mt-16 bg-secondary rounded-2xl p-8 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {statistics.map((stat) => (
                <div key={stat.id}>
                  <div className="text-3xl font-bold text-secondary-foreground mb-2">
                    {stat.stat_value_ar}
                  </div>
                  <p className="text-sm text-secondary-foreground/90">
                    {stat.description_ar}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategorySection;
