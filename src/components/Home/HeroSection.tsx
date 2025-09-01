import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      ></div>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              اكتشف المغامرة
              <br />
              <span className="text-yellow-200">في كل مكان</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              انضم إلى أكبر منصة للأنشطة الخارجية في المملكة. هايكنج، غوص، تخييم ومغامرات لا تُنسى
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Select>
                  <SelectTrigger className="pr-10">
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="riyadh">الرياض</SelectItem>
                    <SelectItem value="jeddah">جدة</SelectItem>
                    <SelectItem value="taif">الطائف</SelectItem>
                    <SelectItem value="qassim">القصيم</SelectItem>
                    <SelectItem value="abha">أبها</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Select>
                  <SelectTrigger className="pr-10">
                    <SelectValue placeholder="نوع النشاط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hiking">هايكنج</SelectItem>
                    <SelectItem value="diving">غوص</SelectItem>
                    <SelectItem value="camping">تخييم</SelectItem>
                    <SelectItem value="climbing">تسلق</SelectItem>
                    <SelectItem value="cycling">دراجات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="date"
                  className="pr-10"
                  placeholder="التاريخ"
                />
              </div>

              <Button className="h-12 text-lg font-semibold bg-primary hover:bg-primary-glow">
                <Search className="w-5 h-5 ml-2" />
                ابحث الآن
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hero" size="lg">
              اكتشف الفعاليات
            </Button>
            <Button variant="hero" size="lg">
              سجّل فعاليتك
            </Button>
            <Button variant="hero" size="lg">
              قدّم خدمتك
            </Button>
          </div>

          {/* Terms and Conditions */}
          <div className="pt-8 border-t border-white/20">
            <div className="text-center space-y-4">
              <p className="text-sm text-white/90">
                بالمتابعة، أنت توافق على 
                <a href="/terms" className="text-yellow-200 hover:text-yellow-100 underline mx-1">
                  الشروط والأحكام
                </a>
                و
                <a href="/privacy" className="text-yellow-200 hover:text-yellow-100 underline mx-1">
                  سياسة الخصوصية
                </a>
              </p>
              <p className="text-xs text-white/70">
                جميع الأسعار شاملة ضريبة القيمة المضافة 15%
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;