import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Layout/Navbar';

const InterestsSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
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
        setError('حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleInterestToggle = (interestName: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestName)
        ? prev.filter(i => i !== interestName)
        : [...prev, interestName]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (selectedInterests.length === 0) {
      toast.error('يرجى اختيار اهتمام واحد على الأقل');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ interests: selectedInterests })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('تم حفظ اهتماماتك بنجاح');
      navigate('/settings');
    } catch (err: any) {
      console.error('Error saving interests:', err);
      toast.error('حدث خطأ في حفظ الاهتمامات');
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            رجوع للملف الشخصي
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground">الاهتمامات</h1>
          <p className="text-muted-foreground mt-2">اختر اهتماماتك لنساعدك في اكتشاف الفعاليات والأنشطة المناسبة لك</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>اهتماماتي</CardTitle>
            <CardDescription>اختر واحد أو أكثر من الاهتمامات التي تناسبك</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interests.map((interest) => (
                <div key={interest.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={interest.id}
                    checked={selectedInterests.includes(interest.name_ar)}
                    onCheckedChange={() => handleInterestToggle(interest.name_ar)}
                  />
                  <Label 
                    htmlFor={interest.id} 
                    className="cursor-pointer flex-1 text-right"
                  >
                    {interest.name_ar}
                  </Label>
                </div>
              ))}
            </div>

            {selectedInterests.length > 0 && (
              <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  اخترت {selectedInterests.length} من {interests.length} اهتمامات
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
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التغييرات'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/profile')}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InterestsSettings;
