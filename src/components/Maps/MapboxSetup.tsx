import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import InteractiveMapbox from './InteractiveMapbox';

interface EventLocation {
  id: string;
  title: string;
  title_ar: string;
  category: string;
  location: [number, number];
  price: number;
  rating: number;
  date: string;
  description?: string;
  difficulty?: string;
  duration?: string;
}

interface MapboxSetupProps {
  events?: EventLocation[];
  onEventSelect?: (event: EventLocation) => void;
}

const MapboxSetup: React.FC<MapboxSetupProps> = ({ 
  events = [], 
  onEventSelect 
}) => {
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidKey, setIsValidKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sample events for demonstration
  const sampleEvents: EventLocation[] = [
    {
      id: '1',
      title: 'Tuwaiq Mountain Hiking',
      title_ar: 'هايكنج جبل طويق',
      category: 'hiking',
      location: [46.6753, 24.7136], // Riyadh
      price: 200,
      rating: 4.8,
      date: '2024-03-15',
      difficulty: 'متوسط',
      duration: '6 ساعات'
    },
    {
      id: '2',
      title: 'Red Sea Diving',
      title_ar: 'غوص البحر الأحمر',
      category: 'diving',
      location: [39.1637, 21.4858], // Jeddah
      price: 350,
      rating: 4.9,
      date: '2024-03-18',
      difficulty: 'متقدم',
      duration: '4 ساعات'
    },
    {
      id: '3',
      title: 'Empty Quarter Desert Safari',
      title_ar: 'سفاري الربع الخالي',
      category: 'camping',
      location: [48.4, 22.0], // Empty Quarter
      price: 450,
      rating: 4.7,
      date: '2024-03-20',
      difficulty: 'سهل',
      duration: '3 أيام'
    }
  ];

  const displayEvents = events.length > 0 ? events : sampleEvents;

  useEffect(() => {
    // Check if API key is stored
    const storedKey = localStorage.getItem('mapbox_token');
    if (storedKey) {
      setApiKey(storedKey);
      setIsValidKey(true);
    }
  }, []);

  const validateApiKey = async (key: string) => {
    if (!key || !key.startsWith('pk.')) {
      return false;
    }

    try {
      setIsLoading(true);
      // Test the API key by making a simple request
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${key}&limit=1`
      );
      
      return response.ok;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      toast({
        title: t('error'),
        description: 'يرجى إدخال مفتاح API',
        variant: 'destructive'
      });
      return;
    }

    const isValid = await validateApiKey(apiKey);
    
    if (isValid) {
      localStorage.setItem('mapbox_token', apiKey);
      setIsValidKey(true);
      toast({
        title: 'تم بنجاح!',
        description: 'تم حفظ مفتاح Mapbox وهو صالح للاستخدام'
      });
    } else {
      toast({
        title: t('error'),
        description: 'مفتاح API غير صالح. تأكد من صحة المفتاح وأنه يبدأ بـ pk.',
        variant: 'destructive'
      });
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('mapbox_token');
    setApiKey('');
    setIsValidKey(false);
    toast({
      title: 'تم الحذف',
      description: 'تم حذف مفتاح Mapbox API'
    });
  };

  if (!isValidKey) {
    return (
      <div className="w-full space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              إعداد خريطة Mapbox التفاعلية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                لعرض الخرائط التفاعلية، تحتاج إلى مفتاح API من Mapbox. 
                يمكنك الحصول على مفتاح مجاني من موقع Mapbox.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mapbox-token">مفتاح Mapbox API</Label>
                <div className="relative">
                  <Input
                    id="mapbox-token"
                    type={showKey ? 'text' : 'password'}
                    placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  يجب أن يبدأ المفتاح بـ "pk." ويكون صالحاً للاستخدام العام
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleApiKeySubmit}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'جاري التحقق...' : 'حفظ وتفعيل الخريطة'}
                </Button>
                <Button
                  variant="outline"
                  asChild
                >
                  <a 
                    href="https://account.mapbox.com/access-tokens/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    الحصول على مفتاح
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">كيفية الحصول على مفتاح Mapbox API:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>اذهب إلى <strong>account.mapbox.com</strong> وأنشئ حساباً مجانياً</li>
                <li>اذهب إلى صفحة "Access tokens"</li>
                <li>انسخ "Default public token" أو أنشئ مفتاحاً جديداً</li>
                <li>الصق المفتاح في الحقل أعلاه</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-600 font-medium">Mapbox متصل</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearApiKey}
        >
          تغيير المفتاح
        </Button>
      </div>
      
      <InteractiveMapbox
        events={displayEvents}
        onEventSelect={onEventSelect}
        showRoutes={true}
        allowEdit={false}
      />
    </div>
  );
};

export default MapboxSetup;