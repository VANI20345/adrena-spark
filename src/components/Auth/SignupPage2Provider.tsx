import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SignupData } from './SignupFlow';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface SignupPage2ProviderProps {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const SignupPage2Provider = ({ data, updateData, onBack, onSubmit, isSubmitting }: SignupPage2ProviderProps) => {
  const { isRTL } = useLanguageContext();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const align = isRTL ? 'text-right' : 'text-left';

  const [error, setError] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [commercialReg, setCommercialReg] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: citiesData } = await supabase
          .from('cities')
          .select('id, name, name_ar')
          .eq('is_active', true)
          .order('name_ar');
        if (citiesData) setCities(citiesData);

        // Try service_categories first, fallback to interest_categories if empty
        const { data: categoriesData } = await supabase
          .from('service_categories')
          .select('id, name, name_ar')
          .eq('is_active', true)
          .order('name_ar');

        if (categoriesData && categoriesData.length > 0) {
          setServiceCategories(categoriesData);
        } else {
          const { data: interestsData } = await supabase
            .from('interest_categories')
            .select('id, name, name_ar')
            .order('name_ar');
          if (interestsData) setServiceCategories(interestsData as any);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(L('حدث خطأ في تحميل البيانات', 'Failed to load data'));
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

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError(L('نوع الملف غير مدعوم. يُسمح فقط بـ PNG, JPG, PDF, DOC, DOCX',
        'Unsupported file type. Allowed: PNG, JPG, PDF, DOC, DOCX'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(L('حجم الملف يجب أن يكون أقل من 2 ميجابايت', 'File must be under 2 MB'));
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

    if (!data.serviceTypes || data.serviceTypes.length === 0) {
      setError(L('يرجى اختيار نوع خدمة واحد على الأقل', 'Please select at least one service type'));
      return;
    }
    if (!data.city) {
      setError(L('يرجى اختيار المدينة', 'Please select a city'));
      return;
    }
    if (!data.address || data.address.trim() === '') {
      setError(L('يرجى إدخال العنوان', 'Please enter your address'));
      return;
    }
    if (!idDocument) {
      setError(L('يرجى رفع صورة الهوية', 'Please upload your ID document'));
      return;
    }
    if (!commercialReg) {
      setError(L('يرجى رفع السجل التجاري', 'Please upload your commercial registration'));
      return;
    }
    if (!license) {
      setError(L('يرجى رفع الرخصة / التصريح', 'Please upload your license / permit'));
      return;
    }
    if (!agreeTerms) {
      setError(L('يجب الموافقة على الشروط والأحكام', 'You must agree to the Terms and Conditions'));
      return;
    }
    if (!agreePrivacy) {
      setError(L('يجب الموافقة على سياسة الخصوصية', 'You must agree to the Privacy Policy'));
      return;
    }

    updateData({ idDocument, commercialReg, license });
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
    <form onSubmit={handleSubmit} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Service Types */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className={`text-base ${align} block`}>{L('نوع الخدمة', 'Service type')}</Label>
          <span className="text-sm text-muted-foreground">
            {data.serviceTypes?.length || 0} {L('محددة', 'selected')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {L('اختر الخدمات التي تقدمها (يمكنك اختيار عدة خيارات)',
            'Select the services you offer (you can pick multiple)')}
        </p>

        {serviceCategories.length === 0 ? (
          <Alert>
            <AlertDescription>
              {L('لا توجد خدمات متاحة حالياً. يرجى المحاولة لاحقاً.',
                'No service options are available right now. Please try again later.')}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 border rounded-lg bg-muted/30">
            {serviceCategories.map((service) => (
              <div
                key={service.id}
                className={`flex items-center gap-2 p-2 rounded hover:bg-background transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Checkbox
                  id={service.id}
                  checked={data.serviceTypes?.includes(service.name) || false}
                  onCheckedChange={() => handleServiceToggle(service.name)}
                />
                <Label htmlFor={service.id} className="cursor-pointer text-sm flex-1">
                  {isRTL ? service.name_ar : service.name}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* City */}
      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="city" className={`${align} block`}>{L('المدينة', 'City')}</Label>
        <Select value={data.city} onValueChange={(value) => updateData({ city: value })}>
          <SelectTrigger className={align} dir={isRTL ? 'rtl' : 'ltr'}>
            <SelectValue placeholder={L('اختر المدينة', 'Select a city')} />
          </SelectTrigger>
          <SelectContent className={align} dir={isRTL ? 'rtl' : 'ltr'}>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.name_ar} className={align}>
                {isRTL ? city.name_ar : city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Address */}
      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="address" className={`${align} block`}>{L('العنوان', 'Address')}</Label>
        <Input
          id="address"
          type="text"
          placeholder={L('أدخل العنوان الكامل', 'Enter your full address')}
          value={data.address || ''}
          onChange={(e) => updateData({ address: e.target.value })}
          required
          className={align}
        />
      </div>

      {/* Documents */}
      <div className={`space-y-4 pt-4 border-t ${align}`}>
        <Label className={`text-base ${align} block`}>{L('المستندات المطلوبة', 'Required documents')}</Label>

        {[
          { id: 'idDocument', file: idDocument, setter: setIdDocument, label: L('صورة الهوية *', 'ID document *') },
          { id: 'commercialReg', file: commercialReg, setter: setCommercialReg, label: L('السجل التجاري *', 'Commercial registration *') },
          { id: 'license', file: license, setter: setLicense, label: L('رخصة / تصريح *', 'License / Permit *') },
        ].map(({ id, file, setter, label }) => (
          <div key={id} className={`space-y-2 ${align}`}>
            <Label htmlFor={id} className={`text-sm ${align} block`}>{label}</Label>
            <div className="flex items-center gap-2">
              <Input
                id={id}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                onChange={(e) => handleFileChange(e, setter)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(id)?.click()}
                className="flex-1"
              >
                <Upload className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {file ? file.name : L('اختر ملف', 'Choose file')}
              </Button>
              {file && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setter(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          {L('أنواع الملفات المسموحة: PNG, JPG, DOCX, DOC, PDF | الحد الأقصى: 2 ميجابايت',
            'Allowed: PNG, JPG, DOCX, DOC, PDF | Max size: 2 MB')}
        </p>
      </div>

      {/* Agreements */}
      <div className={`space-y-3 pt-4 border-t ${align}`}>
        <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Checkbox
            id="agreeTerms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
          />
          <Label htmlFor="agreeTerms" className={`cursor-pointer text-sm leading-relaxed flex-1 ${align}`}>
            {L('أوافق على ', 'I agree to the ')}
            <Link to="/terms" className="text-primary hover:underline" target="_blank">
              {L('الشروط والأحكام', 'Terms and Conditions')}
            </Link>
          </Label>
        </div>

        <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Checkbox
            id="agreePrivacy"
            checked={agreePrivacy}
            onCheckedChange={(checked) => setAgreePrivacy(checked as boolean)}
          />
          <Label htmlFor="agreePrivacy" className={`cursor-pointer text-sm leading-relaxed flex-1 ${align}`}>
            {L('أوافق على ', 'I agree to the ')}
            <Link to="/privacy" className="text-primary hover:underline" target="_blank">
              {L('سياسة الخصوصية', 'Privacy Policy')}
            </Link>
          </Label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          {L('رجوع', 'Back')}
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? L('جاري الإنشاء...', 'Creating...') : L('إنشاء الحساب', 'Create account')}
        </Button>
      </div>
    </form>
  );
};

export default SignupPage2Provider;
