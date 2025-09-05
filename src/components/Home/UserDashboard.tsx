import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Star, TrendingUp, Plus, Eye, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserDashboard = () => {
  const { userRole } = useAuth();

  const AttendeeDashboard = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">مرحباً بك في أدرينا!</h2>
        <p className="text-muted-foreground">اكتشف الفعاليات المثيرة في منطقتك</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فعالياتي القادمة</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">النقاط المكتسبة</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">85</div>
            <p className="text-xs text-muted-foreground">نقطة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رصيد المحفظة</CardTitle>
            <div className="text-green-600">ريال</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">50</div>
            <p className="text-xs text-muted-foreground">متاح</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild className="h-auto p-4 justify-start">
              <Link to="/explore" className="flex items-center gap-3">
                <Eye className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">استكشف الفعاليات</div>
                  <div className="text-sm text-muted-foreground">ابحث عن فعاليات جديدة</div>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to="/my-events" className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">فعالياتي</div>
                  <div className="text-sm text-muted-foreground">إدارة حجوزاتي</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const OrganizerDashboard = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">لوحة تحكم المنظم</h2>
        <p className="text-muted-foreground">إدارة فعالياتك وتتبع الأداء</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفعاليات النشطة</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">جاري التسجيل</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشاركين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">37</div>
            <p className="text-xs text-muted-foreground">مشارك</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">4,650</div>
            <p className="text-xs text-muted-foreground">ريال</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.5</div>
            <p className="text-xs text-muted-foreground">من 5 نجوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild className="h-auto p-4 justify-start">
              <Link to="/create-event" className="flex items-center gap-3">
                <Plus className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">إنشاء فعالية جديدة</div>
                  <div className="text-sm text-muted-foreground">ابدأ بتنظيم فعالية</div>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to="/manage-events" className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">إدارة الفعاليات</div>
                  <div className="text-sm text-muted-foreground">تتبع فعالياتك</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>فعالياتك الحديثة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">رحلة جبلية إلى أبها</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      2024-02-15
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      25/30 مشارك
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="default">نشط</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">ورشة طبخ تقليدي</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      2024-02-20
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      12/15 مشارك
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="default">نشط</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ProviderDashboard = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">لوحة تحكم مقدم الخدمة</h2>
        <p className="text-muted-foreground">إدارة خدماتك والتواصل مع المنظمين</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الخدمات النشطة</CardTitle>
            <div className="text-primary">📋</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">خدمة متاحة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات الحجز</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">طلب جديد</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">4,150</div>
            <p className="text-xs text-muted-foreground">ريال</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.7</div>
            <p className="text-xs text-muted-foreground">من 5 نجوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild className="h-auto p-4 justify-start">
              <Link to="/create-service" className="flex items-center gap-3">
                <Plus className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">إضافة خدمة جديدة</div>
                  <div className="text-sm text-muted-foreground">اعرض خدماتك</div>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to="/manage-services" className="flex items-center gap-3">
                <div className="text-6xl">📋</div>
                <div className="text-left">
                  <div className="font-semibold">إدارة الخدمات</div>
                  <div className="text-sm text-muted-foreground">تتبع خدماتك</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Services */}
      <Card>
        <CardHeader>
          <CardTitle>خدماتك الحديثة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <div className="text-2xl">📷</div>
                </div>
                <div>
                  <h4 className="font-semibold">تأجير معدات التصوير</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      الرياض
                    </span>
                    <span>200 ريال</span>
                  </div>
                </div>
              </div>
              <Badge variant="default">نشط</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <div className="text-2xl">🍽️</div>
                </div>
                <div>
                  <h4 className="font-semibold">خدمة الطعام والمشروبات</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      جدة
                    </span>
                    <span>50 ريال</span>
                  </div>
                </div>
              </div>
              <Badge variant="default">نشط</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  switch (userRole) {
    case 'attendee':
      return <AttendeeDashboard />;
    case 'organizer':
      return <OrganizerDashboard />;
    case 'provider':
      return <ProviderDashboard />;
    default:
      return null;
  }
};

export default UserDashboard;