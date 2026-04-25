import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DiscountServiceForm from './DiscountService/DiscountServiceForm';
import TrainingServiceForm from './TrainingService/TrainingServiceForm';
import OtherServiceForm from './OtherService/OtherServiceForm';

interface ServiceFormWrapperProps {
  serviceId?: string;
  mode: 'create' | 'edit';
}

export const ServiceFormWrapper = ({ serviceId, mode }: ServiceFormWrapperProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [serviceType, setServiceType] = useState<string>('');
  const [serviceData, setServiceData] = useState<any>(null);
  const [loading, setLoading] = useState(mode === 'edit');

  useEffect(() => {
    if (mode === 'edit' && serviceId) {
      fetchServiceData();
    }
  }, [serviceId, mode]);

  const fetchServiceData = async () => {
    if (!serviceId) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      if (data.provider_id !== user?.id) {
        toast({
          title: t('error'),
          description: language === 'ar' ? 'غير مصرح لك بتعديل هذه الخدمة' : 'You are not authorized to edit this service',
          variant: 'destructive',
        });
        navigate('/manage-services');
        return;
      }

      setServiceData(data);
      setServiceType(data.service_type || 'other');
    } catch (error) {
      console.error('Error fetching service:', error);
      toast({
        title: t('error'),
        description: language === 'ar' ? 'خطأ في تحميل بيانات الخدمة' : 'Error loading service data',
        variant: 'destructive',
      });
      navigate('/manage-services');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-xl">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  // For create mode, show type selection first if not set
  if (mode === 'create' && !serviceType) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <h2 className="text-2xl font-bold mb-6">
          {language === 'ar' ? 'اختر نوع الخدمة' : 'Select Service Type'}
        </h2>
        {/* Add service type selection UI here */}
      </div>
    );
  }

  const renderServiceForm = () => {
    switch (serviceType) {
      case 'discount':
        return <DiscountServiceForm />;
      case 'training':
        return <TrainingServiceForm />;
      case 'other':
      default:
        return <OtherServiceForm />;
    }
  };

  return renderServiceForm();
};
