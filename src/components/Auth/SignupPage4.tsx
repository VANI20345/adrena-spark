import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { SignupData } from './SignupFlow';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface SignupPage4Props {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const SignupPage4 = ({ data, updateData, onBack, onSubmit, isSubmitting }: SignupPage4Props) => {
  const { isRTL } = useLanguageContext();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const [error, setError] = useState('');
  const [interests, setInterests] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        setLoading(true);
        const { data: interestsData, error } = await supabase
          .from('interest_categories')
          .select('id, name, name_ar')
          .order('name_ar');

        if (!error && interestsData) {
          setInterests(interestsData as unknown as Array<{ id: string; name: string; name_ar: string }>);
        } else if (error) {
          console.error('Error fetching interests:', error);
          setError(L('حدث خطأ في تحميل الاهتمامات', 'Failed to load interests'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, []);

  const handleInterestToggle = (interestName: string) => {
    const newInterests = data.interests.includes(interestName)
      ? data.interests.filter(i => i !== interestName)
      : [...data.interests, interestName];
    updateData({ interests: newInterests });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (data.interests.length === 0) {
      setError(L('يرجى اختيار هواية واحدة على الأقل', 'Please select at least one hobby'));
      return;
    }

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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">{L('اختر اهتماماتك (هواياتك)', 'Select your interests (hobbies)')}</Label>
          <span className="text-sm text-muted-foreground">
            {data.interests.length} {L('محددة', 'selected')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {L('اختر الأنشطة والهوايات التي تهمك (يمكنك اختيار عدة خيارات)',
            'Choose activities and hobbies that interest you (you can pick multiple)')}
        </p>

        {interests.length === 0 ? (
          <Alert>
            <AlertDescription>{L('لا توجد اهتمامات متاحة حالياً', 'No interests available right now')}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-4 border rounded-lg bg-muted/30">
            {interests.map((interest) => (
              <div
                key={interest.id}
                className={`flex items-center gap-2 p-2 rounded hover:bg-background transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Checkbox
                  id={interest.id}
                  checked={data.interests.includes(interest.name)}
                  onCheckedChange={() => handleInterestToggle(interest.name)}
                />
                <Label htmlFor={interest.id} className="cursor-pointer text-sm flex-1">
                  {isRTL ? interest.name_ar : interest.name}
                </Label>
              </div>
            ))}
          </div>
        )}
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

export default SignupPage4;
