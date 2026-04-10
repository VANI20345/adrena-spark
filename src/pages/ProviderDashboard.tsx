import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  Wallet,
  Plus,
  Eye,
  Settings,
  MessageSquare,
  MapPin,
  Clock,
  Star,
  DollarSign,
  Phone,
  User,
  Calendar,
  Mail,
  FileText,
  CreditCard,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle
} from 'lucide-react';
import { servicesService, profilesService } from '@/services/supabaseServices';
import { serviceBookingService } from '@/services/serviceBookingService';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import ProviderReports from '@/components/ProviderReports';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProviderRevenueCharts from '@/components/Dashboard/ProviderRevenueCharts';

interface Service {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  category_id: string | null;
  location: string | null;
  location_ar: string | null;
  price: number;
  duration_minutes: number | null;
  status: string;
  image_url: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceRequest {
  id: string;
  event_id: string;
  service_id: string;
  organizer_id: string;
  provider_id: string;
  requested_price: number | null;
  negotiated_price: number | null;
  status: string;
  message: string | null;
  response_message: string | null;
  created_at: string;
  updated_at: string;
  events?: {
    title: string;
    title_ar: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface Stats {
  totalServices: number;
  totalRevenue: number;
  totalBookings: number;
  activeServices: number;
  avgRating: number;
}

const ProviderDashboard = () => {
  const { user, profile } = useAuth();
  const { t, language } = useLanguageContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Fetch wallet data
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['provider-services', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await servicesService.getByProvider(user.id);
      if (error) throw error;
      return (data as unknown as Service[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch service requests
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ['service-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { requests } = await servicesService.getProviderStats(user.id);
      if (requests.error) throw requests.error;
      return (requests.data as unknown as ServiceRequest[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch service bookings
  const { data: serviceBookings = [] } = useQuery({
    queryKey: ['service-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const result = await serviceBookingService.getProviderBookings(user.id);
      return result.data || [];
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000,
  });

  // Fetch provider reviews for rating calculation
  const { data: providerReviews = [] } = useQuery({
    queryKey: ['provider-reviews', user?.id, services],
    queryFn: async () => {
      if (!user?.id || services.length === 0) return [];
      const serviceIds = services.map(s => s.id);
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .in('service_id', serviceIds);
      return data || [];
    },
    enabled: !!user?.id && services.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate average rating from real reviews
  const avgRating = providerReviews.length > 0 
    ? providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length 
    : 0;

  // Calculate stats
  const stats: Stats = {
    totalServices: services.filter(s => s.status === 'approved').length,
    totalRevenue: 
      serviceRequests
        .filter(r => r.status === 'accepted' && r.negotiated_price)
        .reduce((sum, r) => sum + (r.negotiated_price || 0), 0) +
      serviceBookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0),
    totalBookings: 
      serviceRequests.filter(r => r.status === 'accepted').length + 
      serviceBookings.length,
    activeServices: services.filter(s => s.status === 'approved').length,
    avgRating
  };

  const loading = servicesLoading;

  const banks = [
    { id: 'rajhi', name: language === 'ar' ? 'مصرف الراجحي' : 'Al Rajhi Bank' },
    { id: 'ncb', name: language === 'ar' ? 'البنك الأهلي التجاري' : 'National Commercial Bank' },
    { id: 'riyad', name: language === 'ar' ? 'بنك الرياض' : 'Riyad Bank' },
    { id: 'samba', name: language === 'ar' ? 'بنك سامبا' : 'Samba Bank' },
    { id: 'arab', name: language === 'ar' ? 'البنك العربي الوطني' : 'Arab National Bank' }
  ];

  const currentBalance = walletData?.balance || 0;
  const totalEarnings = walletData?.total_earned || 0;
  const totalWithdrawn = walletData?.total_withdrawn || 0;
  const availableForWithdraw = Math.max(0, currentBalance - 50);

  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedBank || !accountNumber) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const availableBalance = (walletData?.balance || 0) - 50;

    if (amount < 100) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "الحد الأدنى للسحب هو 100 ريال" : "Minimum withdrawal is 100 SAR",
        variant: "destructive"
      });
      return;
    }

    if (amount > availableBalance) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "المبلغ أكبر من الرصيد المتاح" : "Amount exceeds available balance",
        variant: "destructive"
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user!.id,
          type: 'withdraw',
          amount: -amount,
          description: language === 'ar' 
            ? `سحب إلى ${banks.find(b => b.id === selectedBank)?.name} - ${accountNumber}`
            : `Withdrawal to ${banks.find(b => b.id === selectedBank)?.name} - ${accountNumber}`,
          status: 'pending'
        });

      if (error) throw error;
      
      toast({
        title: language === 'ar' ? "تم بنجاح!" : "Success!",
        description: language === 'ar' 
          ? `تم طلب سحب ${amount} ريال. ستتم المعالجة خلال 1-3 أيام عمل.`
          : `Withdrawal request of ${amount} SAR has been submitted. Processing takes 1-3 business days.`
      });
      
      setWithdrawAmount('');
      setSelectedBank('');
      setAccountNumber('');
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "حدث خطأ في طلب السحب" : "An error occurred during withdrawal request",
        variant: "destructive"
      });
    } finally {
      setIsWithdrawing(false);
    }
  };


  const handleBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await serviceBookingService.updateStatus(bookingId, status);
      if (error) throw error;
      
      const statusText = status === 'confirmed' 
        ? (language === 'ar' ? 'تأكيد' : 'confirm')
        : status === 'completed' 
          ? (language === 'ar' ? 'إكمال' : 'complete')
          : (language === 'ar' ? 'إلغاء' : 'cancel');
      
      toast({
        title: language === 'ar' ? "تم تحديث الحجز" : "Booking Updated",
        description: language === 'ar' 
          ? `تم ${statusText} الحجز بنجاح`
          : `Booking ${statusText}ed successfully`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['service-bookings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "حدث خطأ أثناء تحديث حالة الحجز" : "An error occurred while updating booking status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {language === 'ar' ? `مرحباً، ${profile?.full_name || 'مقدم الخدمة'}!` : `Welcome, ${profile?.full_name || 'Provider'}!`}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'إدارة خدماتك وتتبع طلبات المنظمين' : 'Manage your services and track organizer requests'}
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/create-service">
                <Plus className="h-4 w-4" />
                {t('providerDashboard.addService')}
              </Link>
            </Button>
          </div>

          {/* Wallet Section */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {t('providerDashboard.wallet')}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إدارة أموالك ومتابعة الأرباح' : 'Manage your funds and track earnings'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {currentBalance.toLocaleString()} {t('providerDashboard.sar')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'المتاح للسحب' : 'Available for Withdrawal'}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {availableForWithdraw.toLocaleString()} {t('providerDashboard.sar')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'إجمالي الأرباح' : 'Total Earnings'}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {totalEarnings.toLocaleString()} {t('providerDashboard.sar')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'إجمالي السحوبات' : 'Total Withdrawals'}
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {totalWithdrawn.toLocaleString()} {t('providerDashboard.sar')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-2" disabled={availableForWithdraw < 100}>
                      <CreditCard className="h-4 w-4" />
                      {language === 'ar' ? 'سحب الأموال' : 'Withdraw Funds'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{language === 'ar' ? 'سحب الأموال' : 'Withdraw Funds'}</DialogTitle>
                      <DialogDescription>
                        {language === 'ar' ? 'اسحب أموالك إلى حسابك البنكي' : 'Withdraw your funds to your bank account'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="amount">
                          {language === 'ar' ? `المبلغ (${t('providerDashboard.sar')})` : `Amount (${t('providerDashboard.sar')})`}
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          min="100"
                          max={availableForWithdraw}
                          placeholder={language === 'ar' ? 'أدخل المبلغ' : 'Enter amount'}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === 'ar' ? `المتاح للسحب: ${availableForWithdraw}` : `Available: ${availableForWithdraw}`} {t('providerDashboard.sar')}
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="bank">{language === 'ar' ? 'البنك' : 'Bank'}</Label>
                        <Select value={selectedBank} onValueChange={setSelectedBank}>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select bank'} />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>
                                {bank.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="account">{language === 'ar' ? 'رقم الحساب' : 'Account Number'}</Label>
                        <Input
                          id="account"
                          placeholder={language === 'ar' ? 'أدخل رقم الحساب البنكي' : 'Enter bank account number'}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                        />
                      </div>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {language === 'ar' 
                            ? 'مدة المعالجة: 1-3 أيام عمل. رسوم السحب: 5 ريال'
                            : 'Processing time: 1-3 business days. Withdrawal fee: 5 SAR'}
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        onClick={handleWithdraw} 
                        disabled={isWithdrawing}
                        className="w-full"
                      >
                        {isWithdrawing 
                          ? (language === 'ar' ? "جاري المعالجة..." : "Processing...")
                          : (language === 'ar' ? "تأكيد السحب" : "Confirm Withdrawal")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" asChild className="gap-2">
                  <Link to="/wallet">
                    <ArrowUpRight className="h-4 w-4" />
                    {language === 'ar' ? 'عرض المحفظة الكاملة' : 'View Full Wallet'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('providerDashboard.totalServices')}</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? '+1 هذا الشهر' : '+1 this month'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('providerDashboard.totalRevenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalRevenue.toLocaleString()} {t('providerDashboard.sar')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? '+20% من الشهر الماضي' : '+20% from last month'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? '+12 هذا الشهر' : '+12 this month'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('providerDashboard.activeServices')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.activeServices}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'متاح للحجز' : 'Available for booking'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'متوسط التقييم' : 'Average Rating'}
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'من 5 نجوم' : 'out of 5 stars'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Unified Charts and Reports Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'الإحصائيات والتقارير' : 'Statistics & Reports'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تحليل شامل لأداء خدماتك' : 'Comprehensive analysis of your services performance'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="revenue" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="revenue">{t('providerDashboard.revenueCharts')}</TabsTrigger>
                  <TabsTrigger value="bookings">{t('providerDashboard.bookingsCharts')}</TabsTrigger>
                  <TabsTrigger value="reports">{t('providerDashboard.detailedReports')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="revenue" className="mt-6">
                  <ProviderRevenueCharts providerId={user?.id || ""} />
                </TabsContent>
                
                <TabsContent value="bookings" className="mt-6">
                  <ProviderReports 
                    providerId={user?.id || ""} 
                    services={services || []}
                    serviceBookings={serviceBookings || []}
                    chartOnly={true}
                  />
                </TabsContent>
                
                <TabsContent value="reports" className="mt-6">
                  <ProviderReports 
                    providerId={user?.id || ""} 
                    services={services || []}
                    serviceBookings={serviceBookings || []}
                    chartOnly={false}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Quick Actions - Kept simple without reports button */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <Link to="/create-service" className="block p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('providerDashboard.addService')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'قم بإضافة خدمة جديدة للعملاء' : 'Add a new service for customers'}
                    </p>
                  </div>
                </div>
              </Link>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <Link to="/service-requests" className="block p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('providerDashboard.viewRequests')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إدارة طلبات الخدمات الواردة' : 'Manage incoming service requests'}
                    </p>
                  </div>
                </div>
              </Link>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <Link to="/manage-services" className="block p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('providerDashboard.manageServices')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'تعديل وحذف الخدمات الموجودة' : 'Edit and delete existing services'}
                    </p>
                  </div>
                </div>
              </Link>
            </Card>
          </div>

          {/* Services Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('providerDashboard.services')}</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/manage-services">{language === 'ar' ? 'عرض الكل' : 'View All'}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : services && services.length > 0 ? (
                <div className="space-y-4">
                  {services.slice(0, 5).map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {service.image_url && (
                          <img
                            src={service.image_url}
                            alt={language === 'ar' ? service.name_ar : service.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold">
                            {language === 'ar' ? service.name_ar : service.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {service.price.toLocaleString()} {t('providerDashboard.sar')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={service.status === 'approved' ? 'default' : 'secondary'}>
                        {service.status === 'approved' 
                          ? (language === 'ar' ? 'نشط' : 'Active')
                          : (language === 'ar' ? 'معلق' : 'Pending')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد خدمات بعد' : 'No services yet'}
                  </p>
                  <Button asChild className="mt-4">
                    <Link to="/create-service">{t('providerDashboard.addService')}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Bookings - Customer Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {language === 'ar' ? 'حجوزات الخدمات' : 'Service Bookings'}
                </CardTitle>
                <Badge variant="secondary">{serviceBookings.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {serviceBookings && serviceBookings.length > 0 ? (
                <div className="space-y-4">
                  {serviceBookings.slice(0, 10).map((booking: any) => (
                    <div
                      key={booking.id}
                      className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {booking.services?.name_ar || booking.services?.name || 'خدمة'}
                            </h4>
                            <Badge
                              variant={
                                booking.status === 'completed' ? 'default' :
                                booking.status === 'confirmed' ? 'secondary' :
                                booking.status === 'cancelled' ? 'destructive' : 'outline'
                              }
                            >
                              {booking.status === 'completed' ? (language === 'ar' ? 'مكتمل' : 'Completed') :
                               booking.status === 'confirmed' ? (language === 'ar' ? 'مؤكد' : 'Confirmed') :
                               booking.status === 'cancelled' ? (language === 'ar' ? 'ملغي' : 'Cancelled') :
                               (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                            </Badge>
                          </div>
                          
                          {/* Customer Details */}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span className="font-medium text-foreground">
                                {booking.profiles?.full_name || 'عميل'}
                              </span>
                            </div>
                            {booking.profiles?.phone && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${booking.profiles.phone}`} className="hover:text-primary">
                                  {booking.profiles.phone}
                                </a>
                              </div>
                            )}
                          </div>
                          
                          {/* Booking Details */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(booking.service_date).toLocaleDateString('ar-SA')}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {booking.total_amount?.toLocaleString()} {t('providerDashboard.sar')}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleBookingStatus(booking.id, 'confirmed')}
                            >
                              {language === 'ar' ? 'تأكيد' : 'Confirm'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleBookingStatus(booking.id, 'cancelled')}
                            >
                              {language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </Button>
                          </div>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleBookingStatus(booking.id, 'completed')}
                          >
                            {language === 'ar' ? 'إكمال' : 'Complete'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد حجوزات بعد' : 'No bookings yet'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('providerDashboard.serviceRequests')}</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/service-requests">{language === 'ar' ? 'عرض الكل' : 'View All'}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {serviceRequests && serviceRequests.length > 0 ? (
                <div className="space-y-4">
                  {serviceRequests.slice(0, 5).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <h4 className="font-semibold">{request.events?.title || request.events?.title_ar}</h4>
                        <p className="text-sm text-muted-foreground">
                          {request.profiles?.full_name}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {request.negotiated_price?.toLocaleString()} {t('providerDashboard.sar')}
                        </p>
                      </div>
                      <Badge
                        variant={
                          request.status === 'accepted'
                            ? 'default'
                            : request.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {request.status === 'accepted'
                          ? (language === 'ar' ? 'مقبول' : 'Accepted')
                          : request.status === 'pending'
                            ? t('providerDashboard.pending')
                            : (language === 'ar' ? 'مرفوض' : 'Rejected')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد طلبات خدمات' : 'No service requests'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderDashboard;
