import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Users, 
  Download,
  MessageCircle,
  Star
} from 'lucide-react';

const CheckoutSuccess = () => {
  const location = useLocation();
  const { eventId, tickets, total, bookingReference } = location.state || {};

  // Mock event data
  const event = {
    title: "هايكنج جبل طويق المتقدم",
    date: "2024-03-15",
    time: "06:00",
    location: "الرياض",
    organizer: "نادي المغامرات الرياض"
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">تم الحجز بنجاح!</h1>
            <p className="text-muted-foreground">
              تم إرسال تأكيد الحجز إلى بريدك الإلكتروني ورسالة SMS
            </p>
          </div>

          {/* Booking Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                تفاصيل الحجز
                <Badge variant="secondary">
                  #{bookingReference}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-right">
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{event.title}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{event.date} • {event.time}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>المكان:</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>عدد التذاكر:</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{tickets} تذكرة</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>المبلغ المدفوع:</span>
                  <span>{total} ريال</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>الخطوات التالية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Download className="w-6 h-6 text-blue-600" />
                  <div className="text-right">
                    <p className="font-semibold">حمّل تذاكرك</p>
                    <p className="text-sm text-muted-foreground">
                      ستحتاج لإظهارها عند الوصول للفعالية
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                  <div className="text-right">
                    <p className="font-semibold">انضم لقروب الفعالية</p>
                    <p className="text-sm text-muted-foreground">
                      تواصل مع المشاركين الآخرين واحصل على التحديثات
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                  <div className="text-right">
                    <p className="font-semibold">احصل على النقاط</p>
                    <p className="text-sm text-muted-foreground">
                      ستحصل على نقاط الولاء بعد حضور الفعالية
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Button className="w-full">
              <Download className="w-4 h-4 ml-2" />
              تحميل التذاكر
            </Button>
            
            <Button variant="outline" className="w-full">
              <MessageCircle className="w-4 h-4 ml-2" />
              انضم للقروب
            </Button>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link to="/my-events">
                  فعالياتي
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link to="/explore">
                  استكشف المزيد
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              هل تحتاج مساعدة؟ 
              <Link to="/contact" className="text-primary hover:underline mr-1">
                تواصل معنا
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutSuccess;