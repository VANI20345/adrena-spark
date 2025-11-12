import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { SignupData } from './SignupFlow';
import { supabase } from '@/integrations/supabase/client';

interface SignupPage4Props {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const SignupPage4 = ({ data, updateData, onBack, onSubmit, isSubmitting }: SignupPage4Props) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [interests, setInterests] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        setLoading(true);
        const { data: interestsData, error } = await supabase
          .from('user_interests' as any)
          .select('id, name, name_ar')
          .order('name_ar');

        if (!error && interestsData) {
          setInterests(interestsData as unknown as Array<{ id: string; name: string; name_ar: string }>);
        } else if (error) {
          console.error('Error fetching interests:', error);
          setError('حدث خطأ في تحميل الاهتمامات');
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
    setSuccess('');

    if (data.interests.length === 0) {
      setError('يرجى اختيار هواية واحدة على الأقل');
      return;
    }

    onSubmit();
    setSuccess('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني.');
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">اختر اهتماماتك (هواياتك)</Label>
          <span className="text-sm text-muted-foreground">
            {data.interests.length} محددة
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          اختر الأنشطة والهوايات التي تهمك (يمكنك اختيار عدة خيارات)
        </p>
        
        {interests.length === 0 ? (
          <Alert>
            <AlertDescription>لا توجد اهتمامات متاحة حالياً</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-4 border rounded-lg bg-muted/30">
            {interests.map((interest) => (
              <div 
                key={interest.id} 
                className="flex items-center space-x-2 space-x-reverse p-2 rounded hover:bg-background transition-colors"
              >
                <Checkbox
                  id={interest.id}
                  checked={data.interests.includes(interest.name)}
                  onCheckedChange={() => handleInterestToggle(interest.name)}
                />
                <Label 
                  htmlFor={interest.id} 
                  className="cursor-pointer text-sm flex-1"
                >
                  {interest.name_ar}
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

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
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

export default SignupPage4;
