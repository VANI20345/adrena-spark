import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SignupData } from './SignupFlow';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SignupPage2ProviderProps {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const SignupPage2Provider = ({ data, updateData, onBack, onSubmit, isSubmitting }: SignupPage2ProviderProps) => {
  const [error, setError] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);
  const [loading, setLoading] = useState(true);

  // File upload states
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [commercialReg, setCommercialReg] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);

  // Agreement states
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch cities
        const { data: citiesData, error: citiesError } = await supabase
          .from('cities')
          .select('id, name, name_ar')
          .eq('is_active', true)
          .order('name_ar');

        if (!citiesError && citiesData) {
          setCities(citiesData);
        }

        // Fetch service categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('service_categories')
          .select('id, name, name_ar')
          .order('name_ar');

        if (!categoriesError && categoriesData) {
          setServiceCategories(categoriesData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 
                          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('نوع الملف غير مدعوم. يُسمح فقط بـ PNG, JPG, PDF, DOC, DOCX');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الملف يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setError('');
    setter(file);
  };

  const handleServiceToggle = (serviceName: string) => {
    const currentServices = data.serviceTypes || [];
    const newServices = currentServices.includes(serviceName)
      ? currentServices.filter(s => s !== serviceName)
      : [...currentServices, serviceName];
    updateData({ serviceTypes: newServices });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate service types
    if (!data.serviceTypes || data.serviceTypes.length === 0) {
      setError('يرجى اختيار نوع خدمة واحد على الأقل');
      return;
    }

    // Validate city
    if (!data.city) {
      setError('يرجى اختيار المدينة');
      return;
    }

    // Validate address
    if (!data.address || data.address.trim() === '') {
      setError('يرجى إدخال العنوان');
      return;
    }

    // Validate required documents
    if (!idDocument) {
      setError('يرجى رفع صورة الهوية');
      return;
    }

    if (!commercialReg) {
      setError('يرجى رفع السجل التجاري');
      return;
    }

    if (!license) {
      setError('يرجى رفع الرخصة / التصريح');
      return;
    }

    // Validate agreements
    if (!agreeTerms) {
      setError('يجب الموافقة على الشروط والأحكام');
      return;
    }

    if (!agreePrivacy) {
      setError('يجب الموافقة على سياسة الخصوصية');
      return;
    }

    // Store files in signup data for upload during submission
    updateData({ 
      idDocument, 
      commercialReg, 
      license 
    });

    onSubmit();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Service Types Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base text-right block">نوع الخدمة</Label>
          <span className="text-sm text-muted-foreground">
            {data.serviceTypes?.length || 0} محددة
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          اختر الخدمات التي تقدمها (يمكنك اختيار عدة خيارات)
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 border rounded-lg bg-muted/30">
          {serviceCategories.map((service) => (
            <div 
              key={service.id} 
              className="flex items-center space-x-2 space-x-reverse p-2 rounded hover:bg-background transition-colors"
            >
              <Checkbox
                id={service.id}
                checked={data.serviceTypes?.includes(service.name) || false}
                onCheckedChange={() => handleServiceToggle(service.name)}
              />
              <Label 
                htmlFor={service.id} 
                className="cursor-pointer text-sm flex-1"
              >
                {service.name_ar}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* City Selection */}
      <div className="space-y-2 text-right">
        <Label htmlFor="city" className="text-right block">المدينة</Label>
        <Select value={data.city} onValueChange={(value) => updateData({ city: value })}>
          <SelectTrigger className="text-right" dir="rtl">
            <SelectValue placeholder="اختر المدينة" />
          </SelectTrigger>
          <SelectContent className="text-right" dir="rtl">
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.name_ar} className="text-right">
                {city.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Address */}
      <div className="space-y-2 text-right">
        <Label htmlFor="address" className="text-right block">العنوان</Label>
        <Input
          id="address"
          type="text"
          placeholder="أدخل العنوان الكامل"
          value={data.address || ''}
          onChange={(e) => updateData({ address: e.target.value })}
          required
          className="text-right"
        />
      </div>

      {/* Document Uploads */}
      <div className="space-y-4 pt-4 border-t text-right">
        <Label className="text-base text-right block">المستندات المطلوبة</Label>
        
        {/* ID Document */}
        <div className="space-y-2 text-right">
          <Label htmlFor="idDocument" className="text-sm text-right block">صورة الهوية *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="idDocument"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
              onChange={(e) => handleFileChange(e, setIdDocument)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('idDocument')?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 ml-2" />
              {idDocument ? idDocument.name : 'اختر ملف'}
            </Button>
            {idDocument && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIdDocument(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Commercial Registration */}
        <div className="space-y-2 text-right">
          <Label htmlFor="commercialReg" className="text-sm text-right block">السجل التجاري *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="commercialReg"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
              onChange={(e) => handleFileChange(e, setCommercialReg)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('commercialReg')?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 ml-2" />
              {commercialReg ? commercialReg.name : 'اختر ملف'}
            </Button>
            {commercialReg && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCommercialReg(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* License */}
        <div className="space-y-2 text-right">
          <Label htmlFor="license" className="text-sm text-right block">رخصة / تصريح *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="license"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
              onChange={(e) => handleFileChange(e, setLicense)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('license')?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 ml-2" />
              {license ? license.name : 'اختر ملف'}
            </Button>
            {license && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLicense(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          أنواع الملفات المسموحة: PNG, JPG, DOCX, DOC, PDF | الحد الأقصى: 2 ميجابايت
        </p>
      </div>

      {/* Agreements */}
      <div className="space-y-3 pt-4 border-t text-right">
        <div className="flex items-start gap-2 flex-row-reverse">
          <Label htmlFor="agreeTerms" className="cursor-pointer text-sm leading-relaxed text-right flex-1">
            أوافق على{' '}
            <Link to="/terms" className="text-primary hover:underline" target="_blank">
              الشروط والأحكام
            </Link>
          </Label>
          <Checkbox
            id="agreeTerms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
          />
        </div>

        <div className="flex items-start gap-2 flex-row-reverse">
          <Label htmlFor="agreePrivacy" className="cursor-pointer text-sm leading-relaxed text-right flex-1">
            أوافق على{' '}
            <Link to="/privacy" className="text-primary hover:underline" target="_blank">
              سياسة الخصوصية
            </Link>
          </Label>
          <Checkbox
            id="agreePrivacy"
            checked={agreePrivacy}
            onCheckedChange={(checked) => setAgreePrivacy(checked as boolean)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          رجوع
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </Button>
      </div>
    </form>
  );
};

export default SignupPage2Provider;
