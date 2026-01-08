import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Layout/Navbar';
import { useLanguageContext } from '@/contexts/LanguageContext';

const InterestsSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguageContext();
  
  const [interests, setInterests] = useState<Array<{ id: string; name: string; name_ar: string }>>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch all interests
        const { data: interestsData, error: interestsError } = await supabase
          .from('user_interests')
          .select('id, name, name_ar')
          .order('name_ar');

        if (interestsError) throw interestsError;
        setInterests(interestsData || []);

        // Fetch user's current interests
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('interests')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;
        setSelectedInterests(profileData?.interests || []);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(language === 'ar' ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, language]);

  const handleInterestToggle = (interest: { name: string; name_ar: string }) => {
    // Check if interest is already selected (by either name or name_ar)
    const isCurrentlySelected = selectedInterests.some(
      selected => selected === interest.name || selected === interest.name_ar
    );
    
    if (isCurrentlySelected) {
      // Remove the interest - filter out both name and name_ar versions
      setSelectedInterests(prev => 
        prev.filter(i => i !== interest.name && i !== interest.name_ar)
      );
    } else {
      // Add the interest using current language name
      const nameToAdd = language === 'ar' ? interest.name_ar : interest.name;
      setSelectedInterests(prev => [...prev, nameToAdd]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (selectedInterests.length === 0) {
      toast.error(language === 'ar' ? 'يرجى اختيار اهتمام واحد على الأقل' : 'Please select at least one interest');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ interests: selectedInterests })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حفظ اهتماماتك بنجاح' : 'Your interests have been saved successfully');
      navigate('/settings');
    } catch (err: any) {
      console.error('Error saving interests:', err);
      toast.error(language === 'ar' ? 'حدث خطأ في حفظ الاهتمامات' : 'Error saving interests');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className={`mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isRTL ? (
              <>
                {language === 'ar' ? 'رجوع للملف الشخصي' : 'Back to Profile'}
                <ArrowRight className="h-4 w-4 mr-2" />
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'رجوع للملف الشخصي' : 'Back to Profile'}
              </>
            )}
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'ar' ? 'الاهتمامات' : 'Interests'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ar' 
              ? 'اختر اهتماماتك لنساعدك في اكتشاف الفعاليات والأنشطة المناسبة لك'
              : 'Choose your interests to help us discover suitable events and activities for you'}
          </p>
        </div>

        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{language === 'ar' ? 'اهتماماتي' : 'My Interests'}</CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'اختر واحد أو أكثر من الاهتمامات التي تناسبك'
                : 'Select one or more interests that suit you'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interests.map((interest) => {
                // Check if interest is selected by either name or name_ar
                const isSelected = selectedInterests.some(
                  selected => selected === interest.name || selected === interest.name_ar
                );
                
                  return (
                  <div key={interest.id} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Checkbox
                      id={interest.id}
                      checked={isSelected}
                      onCheckedChange={() => handleInterestToggle(interest)}
                    />
                    <Label 
                      htmlFor={interest.id} 
                      className={`cursor-pointer flex-1 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {language === 'ar' ? interest.name_ar : interest.name}
                    </Label>
                  </div>
                );
              })}
            </div>

            {selectedInterests.length > 0 && (
              <div className={`mt-4 p-3 bg-secondary/10 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? `اخترت ${selectedInterests.length} من ${interests.length} اهتمامات`
                    : `Selected ${selectedInterests.length} of ${interests.length} interests`}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving || selectedInterests.length === 0}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/profile')}
                className="flex-1"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InterestsSettings;