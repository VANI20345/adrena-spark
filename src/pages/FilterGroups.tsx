import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FilterState {
  categories: string[];
  city: string;
  participantRange: [number, number];
  ageRange: [number, number];
  gender: string;
}

export default function FilterGroups() {
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    city: '',
    participantRange: [0, 500],
    ageRange: [18, 65],
    gender: 'all'
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    // Fetch real categories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name, name_ar')
      .order('name');
    
    // Fetch real cities
    const { data: citiesData } = await supabase
      .from('cities')
      .select('id, name, name_ar')
      .eq('is_active', true)
      .order('name');

    setCategories(categoriesData || []);
    setCities(citiesData || []);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleApplyFilters = () => {
    // Store filters in sessionStorage for use on groups page
    sessionStorage.setItem('groupFilters', JSON.stringify(filters));
    navigate('/groups/discover-groups');
  };

  const handleResetFilters = () => {
    setFilters({
      categories: [],
      city: '',
      participantRange: [0, 500],
      ageRange: [18, 65],
      gender: 'all'
    });
    sessionStorage.removeItem('groupFilters');
  };

  const hasActiveFilters = 
    filters.categories.length > 0 || 
    filters.city !== '' || 
    filters.participantRange[0] !== 0 || 
    filters.participantRange[1] !== 500 ||
    filters.ageRange[0] !== 18 || 
    filters.ageRange[1] !== 65 ||
    filters.gender !== 'all';

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">
              {isRTL ? 'تصفية المجموعات' : 'Filter Groups'}
            </h1>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'حدد المعايير للعثور على المجموعات المناسبة' 
              : 'Set criteria to find the perfect groups'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Interest Categories */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isRTL ? 'فئات الاهتمام' : 'Interest Categories'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox
                      id={category.id}
                      checked={filters.categories.includes(category.id)}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <Label 
                      htmlFor={category.id}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {isRTL ? category.name_ar : category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* City Selector */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isRTL ? 'المدينة' : 'City'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر المدينة' : 'Select city'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع المدن' : 'All Cities'}</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city.id} value={city.id}>
                      {isRTL ? city.name_ar : city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Participant Count Range */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isRTL ? 'عدد المشاركين' : 'Participant Count'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{filters.participantRange[0]}</span>
                <span>{filters.participantRange[1]}</span>
              </div>
              <Slider
                value={filters.participantRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, participantRange: value as [number, number] }))}
                min={0}
                max={500}
                step={10}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground text-center">
                {isRTL 
                  ? `من ${filters.participantRange[0]} إلى ${filters.participantRange[1]} مشارك` 
                  : `${filters.participantRange[0]} to ${filters.participantRange[1]} participants`}
              </p>
            </CardContent>
          </Card>

          {/* Age Range */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isRTL ? 'الفئة العمرية' : 'Age Range'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{filters.ageRange[0]}</span>
                <span>{filters.ageRange[1]}+</span>
              </div>
              <Slider
                value={filters.ageRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, ageRange: value as [number, number] }))}
                min={18}
                max={65}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground text-center">
                {isRTL 
                  ? `من ${filters.ageRange[0]} إلى ${filters.ageRange[1]} سنة` 
                  : `${filters.ageRange[0]} to ${filters.ageRange[1]} years old`}
              </p>
            </CardContent>
          </Card>

          {/* Gender Selector */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isRTL ? 'الجنس' : 'Gender'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={filters.gender} onValueChange={(value) => setFilters(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الجميع' : 'All'}</SelectItem>
                  <SelectItem value="male">{isRTL ? 'ذكور' : 'Male'}</SelectItem>
                  <SelectItem value="female">{isRTL ? 'إناث' : 'Female'}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8 sticky bottom-4 bg-background p-4 rounded-lg border shadow-lg">
          <Button 
            className="flex-1" 
            size="lg"
            onClick={handleApplyFilters}
          >
            {isRTL ? 'تطبيق التصفية' : 'Apply Filters'}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            size="lg"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
          >
            {isRTL ? 'إلغاء' : 'Reset'}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
