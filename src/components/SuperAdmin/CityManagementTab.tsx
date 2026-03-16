import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Plus, Loader2, Search, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
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
      successActivate: 'تم تفعيل المدينة - الفعاليات والخدمات في هذه المدينة متاحة الآن للحجز',
      successDeactivate: 'تم إلغاء تفعيل المدينة - الفعاليات والخدمات في هذه المدينة لم تعد متاحة للحجز',
      error: 'حدث خطأ',
      totalCities: 'إجمالي المدن',
      activeCities: 'مدن نشطة',
      inactiveCities: 'مدن غير نشطة',
      cityImpactNote: 'تأثير تغيير حالة المدينة',
      cityImpactDesc: 'عند إلغاء تفعيل مدينة، ستصبح جميع الفعاليات والخدمات في هذه المدينة غير متاحة للحجز الجديد',
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
      successActivate: 'City activated - Events and services in this city are now available for booking',
      successDeactivate: 'City deactivated - Events and services in this city are no longer available for booking',
      error: 'An error occurred',
      totalCities: 'Total Cities',
      activeCities: 'Active Cities',
      inactiveCities: 'Inactive Cities',
      cityImpactNote: 'City Status Impact',
      cityImpactDesc: 'When deactivating a city, all events and services in this city will become unavailable for new bookings',
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
      const newStatus = !currentStatus;
      
      // Update city status
      const { error: cityError } = await supabase
        .from('cities')
        .update({ is_active: newStatus })
        .eq('id', cityId);

      if (cityError) throw cityError;

      // Show appropriate success message based on new status
      if (newStatus) {
        toast.success(t.successActivate);
      } else {
        toast.warning(t.successDeactivate);
      }
      
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
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <MapPin className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={isRTL ? 'flex-row-reverse' : ''}>
              <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t.addCity}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
              <DialogTitle>{t.addNewCity}</DialogTitle>
              <DialogDescription>{t.addCityDesc}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={isRTL ? 'text-right block' : ''}>{t.cityName}</Label>
                  <Input
                    value={newCity.name}
                    onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                    placeholder="Riyadh"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={isRTL ? 'text-right block' : ''}>{t.cityNameAr}</Label>
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
                  <Label className={isRTL ? 'text-right block' : ''}>{t.region}</Label>
                  <Input
                    value={newCity.region}
                    onChange={(e) => setNewCity({ ...newCity, region: e.target.value })}
                    placeholder="Central"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={isRTL ? 'text-right block' : ''}>{t.regionAr}</Label>
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
                  <Label className={isRTL ? 'text-right block' : ''}>{t.latitude}</Label>
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
                  <Label className={isRTL ? 'text-right block' : ''}>{t.longitude}</Label>
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
            <DialogFooter className={isRTL ? 'flex-row-reverse gap-2' : 'gap-2'}>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleAddCity} disabled={isSubmitting} className={isRTL ? 'flex-row-reverse' : ''}>
                {isSubmitting && <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />}
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Impact Notice */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className={`text-amber-800 dark:text-amber-300 ${isRTL ? 'text-right' : 'text-left'}`}>
          <strong>{t.cityImpactNote}:</strong> {t.cityImpactDesc}
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.totalCities}</p>
                <p className="text-3xl font-bold">{cities?.length || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.activeCities}</p>
                <p className="text-3xl font-bold text-green-600">{activeCities}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
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
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="relative flex-1 max-w-sm">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-10 text-right' : 'pl-10'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{language === 'ar' ? 'المدينة' : 'City'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{language === 'ar' ? 'المنطقة' : 'Region'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.status}</TableHead>
                <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="font-medium">{isRTL ? city.name_ar : city.name}</p>
                      <p className="text-sm text-muted-foreground">{isRTL ? city.name : city.name_ar}</p>
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                    <p>{isRTL ? city.region_ar : city.region}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={city.is_active ? 'default' : 'secondary'} className={city.is_active ? 'bg-green-600' : 'bg-red-100 text-red-700'}>
                      {city.is_active ? t.active : t.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-3 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                      <span className="text-sm text-muted-foreground">
                        {city.is_active ? t.deactivate : t.activate}
                      </span>
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