import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
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

const CategorySection = () => {
  const categories = [
    {
      id: 'hiking',
      name: 'هايكنج',
      nameEn: 'Hiking',
      icon: Mountain,
      description: 'استكشف أجمل المسارات الجبلية',
      eventCount: 25,
      color: 'from-green-500 to-emerald-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'diving',
      name: 'غوص',
      nameEn: 'Diving',
      icon: Waves,
      description: 'اكتشف عالم البحر الأحمر',
      eventCount: 12,
      color: 'from-blue-500 to-cyan-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'camping',
      name: 'تخييم',
      nameEn: 'Camping',
      icon: Tent,
      description: 'ليالي سحرية تحت النجوم',
      eventCount: 18,
      color: 'from-orange-500 to-amber-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'cycling',
      name: 'دراجات هوائية',
      nameEn: 'Cycling',
      icon: Bike,
      description: 'جولات ممتعة في الطبيعة',
      eventCount: 15,
      color: 'from-purple-500 to-violet-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'motorcycles',
      name: 'دراجات نارية',
      nameEn: 'Motorcycles',
      icon: Car,
      description: 'مغامرات السرعة والإثارة',
      eventCount: 8,
      color: 'from-red-500 to-rose-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'climbing',
      name: 'تسلق جبال',
      nameEn: 'Rock Climbing',
      icon: Mountain,
      description: 'تحدى قمم الجبال',
      eventCount: 10,
      color: 'from-gray-500 to-slate-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'swimming',
      name: 'سباحة',
      nameEn: 'Swimming',
      icon: Waves,
      description: 'فعاليات مائية متنوعة',
      eventCount: 7,
      color: 'from-teal-500 to-blue-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'sandboarding',
      name: 'تزلج رمال',
      nameEn: 'Sandboarding',
      icon: Wind,
      description: 'مغامرة في الكثبان الرملية',
      eventCount: 6,
      color: 'from-yellow-500 to-orange-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'paragliding',
      name: 'طيران شراعي',
      nameEn: 'Paragliding',
      icon: Wind,
      description: 'حلق في السماء',
      eventCount: 4,
      color: 'from-indigo-500 to-blue-600',
      image: '/api/placeholder/400/250'
    },
    {
      id: 'horseback',
      name: 'ركوب خيل',
      nameEn: 'Horseback Riding',
      icon: Compass,
      description: 'رحلات على ظهر الخيول',
      eventCount: 9,
      color: 'from-amber-500 to-yellow-600',
      image: '/api/placeholder/400/250'
    }
  ];

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
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id} 
                className="group cursor-pointer hover:shadow-lg smooth-transition overflow-hidden"
                onClick={() => window.location.href = `/explore?category=${category.id}`}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${category.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 smooth-transition`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary smooth-transition">
                    {category.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {category.eventCount} فعالية
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Featured Categories */}
        <div className="grid md:grid-cols-3 gap-8">
          {categories.slice(0, 3).map((category) => {
            const IconComponent = category.icon;
            return (
              <Card key={category.id} className="group overflow-hidden hover:shadow-xl smooth-transition">
                <div className="relative">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 text-white">
                    <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                    <p className="text-sm opacity-90">{category.description}</p>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="secondary">
                        {category.eventCount} فعالية متاحة
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
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">150+</div>
              <p className="text-sm text-muted-foreground">فعالية شهرياً</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">2,500+</div>
              <p className="text-sm text-muted-foreground">مشارك نشط</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <p className="text-sm text-muted-foreground">منظم معتمد</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">15</div>
              <p className="text-sm text-muted-foreground">مدينة مغطاة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySection;