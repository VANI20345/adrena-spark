import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Plus, Loader2, Search, CheckCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface City {
  id: string;
  name: string;
  name_ar: string;
  region: string | null;
  region_ar: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export const CityManagementTab = () => {
  const { language, isRTL } = useLanguageContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [newCity, setNewCity] = useState({
    name: '',
    name_ar: '',
    region: '',
    region_ar: '',
    latitude: '',
    longitude: '',
  });

  const { data: cities, isLoading, refetch } = useOptimizedQuery(
    ['cities-management'],
    async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name_ar', { ascending: true });
      
      if (error) throw error;
      return data as City[];
    }
  );

  const translations = {
    ar: {
      title: 'إدارة المدن',
      description: 'إضافة وتفعيل وإلغاء تفعيل المدن في النظام',
      addCity: 'إضافة مدينة',
      searchPlaceholder: 'البحث عن مدينة...',
      cityName: 'اسم المدينة (إنجليزي)',
      cityNameAr: 'اسم المدينة (عربي)',
      region: 'المنطقة (إنجليزي)',
      regionAr: 'المنطقة (عربي)',
      latitude: 'خط العرض',
      longitude: 'خط الطول',
      status: 'الحالة',
      active: 'نشطة',
      inactive: 'غير نشطة',
      actions: 'الإجراءات',
      activate: 'تفعيل',
      deactivate: 'إلغاء التفعيل',
      save: 'حفظ',
      cancel: 'إلغاء',
      addNewCity: 'إضافة مدينة جديدة',
      addCityDesc: 'أدخل بيانات المدينة الجديدة',
      successAdd: 'تم إضافة المدينة بنجاح',
      successUpdate: 'تم تحديث حالة المدينة',
      error: 'حدث خطأ',
      totalCities: 'إجمالي المدن',
      activeCities: 'مدن نشطة',
      inactiveCities: 'مدن غير نشطة',
    },
    en: {
      title: 'City Management',
      description: 'Add, activate, and deactivate cities in the system',
      addCity: 'Add City',
      searchPlaceholder: 'Search for a city...',
      cityName: 'City Name (English)',
      cityNameAr: 'City Name (Arabic)',
      region: 'Region (English)',
      regionAr: 'Region (Arabic)',
      latitude: 'Latitude',
      longitude: 'Longitude',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      actions: 'Actions',
      activate: 'Activate',
      deactivate: 'Deactivate',
      save: 'Save',
      cancel: 'Cancel',
      addNewCity: 'Add New City',
      addCityDesc: 'Enter the new city details',
      successAdd: 'City added successfully',
      successUpdate: 'City status updated',
      error: 'An error occurred',
      totalCities: 'Total Cities',
      activeCities: 'Active Cities',
      inactiveCities: 'Inactive Cities',
    },
  };

  const t = translations[language];

  const filteredCities = cities?.filter(city => 
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.name_ar.includes(searchQuery) ||
    city.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.region_ar?.includes(searchQuery)
  ) || [];

  const activeCities = cities?.filter(c => c.is_active).length || 0;
  const inactiveCities = cities?.filter(c => !c.is_active).length || 0;

  const handleToggleCity = async (cityId: string, currentStatus: boolean) => {
    setToggleLoading(cityId);
    try {
      const { error } = await supabase
        .from('cities')
        .update({ is_active: !currentStatus })
        .eq('id', cityId);

      if (error) throw error;

      toast.success(t.successUpdate);
      refetch();
    } catch (error) {
      console.error('Error toggling city:', error);
      toast.error(t.error);
    } finally {
      setToggleLoading(null);
    }
  };

  const handleAddCity = async () => {
    if (!newCity.name || !newCity.name_ar) {
      toast.error(language === 'ar' ? 'يرجى إدخال اسم المدينة' : 'Please enter city name');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('cities').insert({
        name: newCity.name,
        name_ar: newCity.name_ar,
        region: newCity.region || null,
        region_ar: newCity.region_ar || null,
        latitude: newCity.latitude ? parseFloat(newCity.latitude) : null,
        longitude: newCity.longitude ? parseFloat(newCity.longitude) : null,
        is_active: true,
      });

      if (error) throw error;

      toast.success(t.successAdd);
      setNewCity({ name: '', name_ar: '', region: '', region_ar: '', latitude: '', longitude: '' });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error adding city:', error);
      toast.error(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t.addCity}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{t.addNewCity}</DialogTitle>
              <DialogDescription>{t.addCityDesc}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.cityName}</Label>
                  <Input
                    value={newCity.name}
                    onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                    placeholder="Riyadh"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.cityNameAr}</Label>
                  <Input
                    value={newCity.name_ar}
                    onChange={(e) => setNewCity({ ...newCity, name_ar: e.target.value })}
                    placeholder="الرياض"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.region}</Label>
                  <Input
                    value={newCity.region}
                    onChange={(e) => setNewCity({ ...newCity, region: e.target.value })}
                    placeholder="Central"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.regionAr}</Label>
                  <Input
                    value={newCity.region_ar}
                    onChange={(e) => setNewCity({ ...newCity, region_ar: e.target.value })}
                    placeholder="الوسطى"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.latitude}</Label>
                  <Input
                    type="number"
                    step="any"
                    value={newCity.latitude}
                    onChange={(e) => setNewCity({ ...newCity, latitude: e.target.value })}
                    placeholder="24.7136"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.longitude}</Label>
                  <Input
                    type="number"
                    step="any"
                    value={newCity.longitude}
                    onChange={(e) => setNewCity({ ...newCity, longitude: e.target.value })}
                    placeholder="46.6753"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleAddCity} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />}
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.totalCities}</p>
                <p className="text-3xl font-bold">{cities?.length || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.activeCities}</p>
                <p className="text-3xl font-bold text-green-600">{activeCities}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.inactiveCities}</p>
                <p className="text-3xl font-bold text-red-600">{inactiveCities}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'المدينة' : 'City'}</TableHead>
                <TableHead>{language === 'ar' ? 'المنطقة' : 'Region'}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{isRTL ? city.name_ar : city.name}</p>
                      <p className="text-sm text-muted-foreground">{isRTL ? city.name : city.name_ar}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{isRTL ? city.region_ar : city.region}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={city.is_active ? 'default' : 'secondary'}>
                      {city.is_active ? t.active : t.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={city.is_active}
                        disabled={toggleLoading === city.id}
                        onCheckedChange={() => handleToggleCity(city.id, city.is_active)}
                      />
                      {toggleLoading === city.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredCities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد مدن مطابقة' : 'No matching cities'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CityManagementTab;
