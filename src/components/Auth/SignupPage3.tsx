import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { SignupData } from './SignupFlow';

interface SignupPage3Props {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SignupPage3 = ({ data, updateData, onNext, onBack }: SignupPage3Props) => {
  const [error, setError] = useState('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!data.birthDate) {
      setError('يرجى إدخال تاريخ الميلاد');
      return;
    }
    if (!data.gender) {
      setError('يرجى اختيار الجنس');
      return;
    }

    onNext();
  };

  return (
    <form onSubmit={handleNext} className="space-y-4">
      <div className="space-y-2 text-right">
        <Label htmlFor="birthDate" className="text-right block">تاريخ الميلاد</Label>
        <Input
          id="birthDate"
          type="date"
          value={data.birthDate}
          onChange={(e) => updateData({ birthDate: e.target.value })}
          required
          max={new Date().toISOString().split('T')[0]}
          className="text-right"
        />
      </div>

      <div className="space-y-3 text-right">
        <Label className="text-right block">الجنس</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={data.gender === 'male' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => updateData({ gender: 'male' })}
          >
            ذكر
          </Button>
          <Button
            type="button"
            variant={data.gender === 'female' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => updateData({ gender: 'female' })}
          >
            أنثى
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
          رجوع
        </Button>
        <Button type="submit" className="flex-1">
          التالي
        </Button>
      </div>
    </form>
  );
};

export default SignupPage3;
