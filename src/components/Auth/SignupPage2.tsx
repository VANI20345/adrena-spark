import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignupData } from './SignupFlow';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface SignupPage2Props {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SignupPage2 = ({ data, updateData, onNext, onBack }: SignupPage2Props) => {
  const { isRTL } = useLanguageContext();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const align = isRTL ? 'text-right' : 'text-left';
  const [error, setError] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);

  useEffect(() => {
    const fetchCities = async () => {
      const { data: citiesData, error } = await supabase
        .from('cities')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .order('name_ar');
      if (!error && citiesData) setCities(citiesData);
    };
    fetchCities();
  }, []);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!data.city) {
      setError(L('يرجى اختيار المدينة', 'Please select a city'));
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleNext} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="city" className={`${align} block`}>{L('اختر مدينتك', 'Select your city')}</Label>
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          {L('رجوع', 'Back')}
        </Button>
        <Button type="submit" className="flex-1">
          {L('التالي', 'Next')}
        </Button>
      </div>
    </form>
  );
};

export default SignupPage2;
