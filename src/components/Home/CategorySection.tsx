import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/empty-state';
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
  Trophy
} from 'lucide-react';
import { categoriesService, statisticsService } from '@/services/supabaseServices';

// Icon mapping with proper adventure icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mountain,
  Waves,
  Tent,
  Bike,
  TreePine,
  Zap,
  Car,
  Wind,
  Compass,
  Trophy
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesResponse, statisticsResponse] = await Promise.all([
        categoriesService.getAll(),
        statisticsService.getAll()
      ]);

      if (categoriesResponse.error) throw categoriesResponse.error;
      if (statisticsResponse.error) throw statisticsResponse.error;

      setCategories(categoriesResponse.data || []);
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
  }, []);

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return Mountain;
    return iconMap[iconName] || Mountain;
  };

  const getGradientClass = (colorStart?: string, colorEnd?: string) => {
    if (!colorStart || !colorEnd) return 'from-gray-500 to-slate-600';
    return `from-${colorStart} to-${colorEnd}`;
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
            onAction={() => window.location.href = '/explore'}
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            تصنيفات المغامرات
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اكتشف مجموعة متنوعة من الأنشطة والمغامرات التي تناسب جميع المستويات والاهتمامات
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
          {categories.map((category) => {
            const IconComponent = getIconComponent(category.icon_name);
            const gradientClass = getGradientClass(category.color_start, category.color_end);
            
            return (
              <Card 
                key={category.id} 
                className="group cursor-pointer hover:shadow-lg smooth-transition overflow-hidden"
                onClick={() => window.location.href = `/explore?category=${category.id}`}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${gradientClass} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 smooth-transition`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary smooth-transition">
                    {category.name_ar}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {category.event_count} فعالية
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Featured Categories */}
        <div className="grid md:grid-cols-3 gap-8">
          {categories.slice(0, 3).map((category) => {
            const IconComponent = getIconComponent(category.icon_name);
            const gradientClass = getGradientClass(category.color_start, category.color_end);
            
            return (
              <Card key={category.id} className="group overflow-hidden hover:shadow-xl smooth-transition">
                <div className="relative">
                  <div className={`w-full h-48 bg-gradient-to-br ${gradientClass} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-pattern opacity-10"></div>
                    <IconComponent className="w-16 h-16 text-white/80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <div className={`w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 text-white">
                    <h3 className="text-xl font-bold mb-1">{category.name_ar}</h3>
                    <p className="text-sm opacity-90">{category.description_ar}</p>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="secondary">
                        {category.event_count} فعالية متاحة
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/explore?category=${category.id}`}>
                        استكشف
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button size="lg" variant="outline" asChild>
            <Link to="/explore">
              <Trophy className="w-4 h-4 ml-2" />
              عرض جميع التصنيفات
            </Link>
          </Button>
        </div>

        {/* Stats Section */}
        {statistics.length > 0 && (
          <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {statistics.map((stat) => (
                <div key={stat.id}>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {stat.stat_value_ar}
                  </div>
                  <p className="text-sm text-muted-foreground">
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