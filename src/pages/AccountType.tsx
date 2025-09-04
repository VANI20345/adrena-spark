import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Calendar, Briefcase, Check } from 'lucide-react';

const AccountType = () => {
  const navigate = useNavigate();
  const { user, userRole, setUserRole, loading } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Redirect if user already has a role
  useEffect(() => {
    if (userRole && !loading) {
      navigate('/');
    }
  }, [userRole, loading, navigate]);

  const accountTypes = [
    {
      role: 'attendee' as UserRole,
      title: 'باحث/مشارك',
      description: 'أريد استكشاف والمشاركة في الفعاليات',
      icon: Users,
      features: [
        'حجز الفعاليات والمشاركة',
        'نظام النقاط والمكافآت',
        'التقييم والمراجعات',
        'الانضمام لمجموعات الفعاليات',
        'متابعة المنظمين المفضلين'
      ]
    },
    {
      role: 'organizer' as UserRole,
      title: 'منظم الفعاليات',
      description: 'أريد إنشاء وتنظيم فعاليات ترفيهية ورياضية',
      icon: Calendar,
      features: [
        'إنشاء وإدارة الفعاليات',
        'إدارة الحجوزات والمشاركين',
        'ربط الخدمات المساندة',
        'استخدام ماسح QR',
        'استلام الأرباح في المحفظة'
      ]
    },
    {
      role: 'provider' as UserRole,
      title: 'مقدم خدمة',
      description: 'أريد تقديم خدمات مساندة للفعاليات',
      icon: Briefcase,
      features: [
        'إضافة وإدارة الخدمات',
        'استقبال طلبات الربط من المنظمين',
        'إدارة التقييمات والمراجعات',
        'تحديد المدن والأسعار',
        'استلام الأرباح في المحفظة'
      ]
    }
  ];

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError('يرجى اختيار نوع الحساب');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error } = await setUserRole(selectedRole);
      if (error) {
        setError('حدث خطأ في تحديد نوع الحساب');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">اختر نوع حسابك</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            اختر نوع الحساب الذي يناسب احتياجاتك. يمكنك تغيير نوع الحساب لاحقاً من الإعدادات
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {accountTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedRole === type.role;
            
            return (
              <Card 
                key={type.role}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                onClick={() => setSelectedRole(type.role)}
              >
                <CardHeader className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-center">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            size="lg"
            className="px-8"
          >
            {isSubmitting ? 'جاري التحميل...' : 'تأكيد الاختيار والمتابعة'}
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            يمكنك تغيير نوع الحساب في أي وقت من الإعدادات
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountType;