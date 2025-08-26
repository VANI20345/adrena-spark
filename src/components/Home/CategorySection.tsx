import { Card, CardContent } from "@/components/ui/card";
import { Mountain, Waves, Tent, Bike, TreePine, Camera } from "lucide-react";
import { Link } from "react-router-dom";

const CategorySection = () => {
  const categories = [
    {
      id: "hiking",
      title: "هايكنج ومشي",
      description: "اكتشف أجمل المسارات الجبلية",
      icon: Mountain,
      count: "85+ فعالية",
      color: "bg-green-100 text-green-700",
      image: "🏔️"
    },
    {
      id: "diving",
      title: "غوص وسباحة",
      description: "استكشف عالم البحر الأحمر",
      icon: Waves,
      count: "32+ فعالية",
      color: "bg-blue-100 text-blue-700",
      image: "🏊"
    },
    {
      id: "camping",
      title: "تخييم",
      description: "ليالي لا تُنسى تحت النجوم",
      icon: Tent,
      count: "67+ فعالية",
      color: "bg-orange-100 text-orange-700",
      image: "🏕️"
    },
    {
      id: "cycling",
      title: "ركوب الدراجات",
      description: "مغامرات على العجلتين",
      icon: Bike,
      count: "43+ فعالية",
      color: "bg-purple-100 text-purple-700",
      image: "🚴"
    },
    {
      id: "nature",
      title: "استكشاف الطبيعة",
      description: "جولات في المحميات الطبيعية",
      icon: TreePine,
      count: "29+ فعالية",
      color: "bg-emerald-100 text-emerald-700",
      image: "🌲"
    },
    {
      id: "photography",
      title: "تصوير الطبيعة",
      description: "اِلتقط أجمل اللحظات",
      icon: Camera,
      count: "21+ فعالية",
      color: "bg-pink-100 text-pink-700",
      image: "📸"
    }
  ];

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            استكشف حسب النشاط
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اختر نوع المغامرة التي تناسبك واكتشف عالماً جديداً من الأنشطة المثيرة
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Link key={category.id} to={`/explore?category=${category.id}`}>
                <Card className="group hover:shadow-lg smooth-transition cursor-pointer h-full adventure-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse">
                      <div className={`p-3 rounded-xl ${category.color} group-hover:scale-110 smooth-transition`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary smooth-transition">
                            {category.title}
                          </h3>
                          <span className="text-2xl">{category.image}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                        <div className="text-xs font-medium text-primary">
                          {category.count}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;