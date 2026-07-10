import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { SignupData } from './SignupFlow';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface SignupPage3Props {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SignupPage3 = ({ data, updateData, onNext, onBack }: SignupPage3Props) => {
  const { isRTL } = useLanguageContext();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const align = isRTL ? 'text-right' : 'text-left';
  const [error, setError] = useState('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!data.birthDate) {
      setError(L('يرجى إدخال تاريخ الميلاد', 'Please enter your date of birth'));
      return;
    }
    if (!data.gender) {
      setError(L('يرجى اختيار الجنس', 'Please select a gender'));
      return;
    }

    onNext();
  };

  return (
    <form onSubmit={handleNext} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="birthDate" className={`${align} block`}>{L('تاريخ الميلاد', 'Date of birth')}</Label>
        <Input
          id="birthDate"
          type="date"
          value={data.birthDate}
          onChange={(e) => updateData({ birthDate: e.target.value })}
          required
          max={new Date().toISOString().split('T')[0]}
          className={align}
        />
      </div>

      <div className={`space-y-3 ${align}`}>
        <Label className={`${align} block`}>{L('الجنس', 'Gender')}</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={data.gender === 'male' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => updateData({ gender: 'male' })}
          >
            {L('ذكر', 'Male')}
          </Button>
          <Button
            type="button"
            variant={data.gender === 'female' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => updateData({ gender: 'female' })}
          >
            {L('أنثى', 'Female')}
          </Button>
        </div>
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

export default SignupPage3;
