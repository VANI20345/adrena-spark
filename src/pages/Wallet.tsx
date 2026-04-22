import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import TransactionHistory from '@/components/Wallet/TransactionHistory';
import WalletCharts from '@/components/Wallet/WalletCharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  ChevronDown,
  History,
  BarChart3,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

const WalletPage = () => {
  const { user, userRole } = useAuth();
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);

  // Fetch real wallet data from database
  const { data: walletData, isLoading, error: walletError } = useSupabaseQuery({
    queryKey: ['wallet', user?.id],
    queryFn: useCallback(async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data || { balance: 0, total_earned: 0, total_withdrawn: 0 };
    }, [user?.id]),
    enabled: !!user?.id
  });

  // Fetch transactions for charts
  const { data: transactionsData } = useSupabaseQuery({
    queryKey: ['wallet_transactions_chart', user?.id],
    queryFn: useCallback(async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }, [user?.id]),
    enabled: !!user?.id
  });

  // Ensure transactions is always an array
  const transactions = Array.isArray(transactionsData) ? transactionsData : [];

  // Calculate pending withdrawals
  const pendingWithdrawals = transactions.filter(t => t.type === 'withdraw' && t.status === 'pending');
  const pendingAmount = pendingWithdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const banks = [
    { id: 'rajhi', name: language === 'ar' ? 'مصرف الراجحي' : 'Al Rajhi Bank' },
    { id: 'ncb', name: language === 'ar' ? 'البنك الأهلي التجاري' : 'National Commercial Bank' },
    { id: 'riyad', name: language === 'ar' ? 'بنك الرياض' : 'Riyad Bank' },
    { id: 'samba', name: language === 'ar' ? 'بنك سامبا' : 'Samba Bank' },
    { id: 'arab', name: language === 'ar' ? 'البنك العربي الوطني' : 'Arab National Bank' }
  ];

  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedBank || !accountNumber) {
      toast({
        title: t('error'),
        description: t('wallet.errors.fillAllFields'),
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const availableBalance = (walletData?.balance || 0) - 50;

    if (amount < 100) {
      toast({
        title: t('error'),
        description: t('wallet.errors.minimumWithdraw'),
        variant: "destructive"
      });
      return;
    }

    if (amount > availableBalance) {
      toast({
        title: t('error'),
        description: t('wallet.errors.exceedsBalance'),
        variant: "destructive"
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      // Use edge function for withdrawal processing
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          amount,
          bank_name: banks.find(b => b.id === selectedBank)?.name || selectedBank,
          account_number: accountNumber,
          account_holder_name: user?.user_metadata?.full_name || 'Account Holder'
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      toast({
        title: t('success'),
        description: t('wallet.success.withdrawRequested').replace('{amount}', String(amount))
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_transactions_chart'] });
      
      setWithdrawAmount('');
      setSelectedBank('');
      setAccountNumber('');
      setWithdrawDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: t('error'),
        description: error.message || t('wallet.errors.withdrawError'),
        variant: "destructive"
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/10 animate-pulse rounded-2xl" />
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentBalance = walletData?.balance || 0;
  const totalEarnings = walletData?.total_earned || 0;
  const totalWithdrawn = walletData?.total_withdrawn || 0;
  const availableForWithdraw = Math.max(0, currentBalance - 50);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Hero Section - Premium Balance Card (Centered) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-secondary/90 to-info p-8 text-secondary-foreground shadow-2xl"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-teal-300/20 rounded-full blur-xl" />
            
            <div className="relative z-10">
              {/* Centered Balance Content */}
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                {/* Balance Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <span className="text-lg font-medium text-white/90">{t('wallet.currentBalance')}</span>
                  </div>
                  
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl md:text-7xl font-bold tracking-tight">
                      {currentBalance.toLocaleString()}
                    </span>
                    <span className="text-2xl font-medium text-white/80">{t('wallet.riyal')}</span>
                  </div>
                  
                  {/* Status badges */}
                  <div className="flex flex-wrap justify-center gap-3">
                    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {t('wallet.availableForWithdraw')}: {availableForWithdraw.toLocaleString()} {t('wallet.riyal')}
                      </span>
                    </div>
                    {pendingAmount > 0 && (
                      <div className="flex items-center gap-2 bg-warning/30 backdrop-blur-sm rounded-full px-4 py-2">
                        <Clock className="h-4 w-4 text-warning" />
                        <span className="text-sm font-medium">
                          {isRTL ? 'سحب معلق:' : 'Pending:'} {pendingAmount.toLocaleString()} {t('wallet.riyal')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Withdraw Button Only (centered) */}
                <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="lg" 
                      className="gap-2 bg-primary text-primary-foreground hover:bg-primary-glow shadow-lg font-semibold px-8"
                      disabled={availableForWithdraw < 100}
                    >
                      <CreditCard className="h-5 w-5" />
                      {t('wallet.withdrawMoney')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                      <DialogTitle>{t('wallet.withdrawDialog.title')}</DialogTitle>
                      <DialogDescription>
                        {t('wallet.withdrawDialog.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                        <div className="text-sm text-muted-foreground mb-1">{t('wallet.availableForWithdraw')}</div>
                        <div className="text-2xl font-bold text-success">
                          {availableForWithdraw.toLocaleString()} {t('wallet.riyal')}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bank">{t('wallet.withdrawDialog.bank')}</Label>
                        <Select value={selectedBank} onValueChange={setSelectedBank}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('wallet.withdrawDialog.selectBank')} />
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="account">{t('wallet.withdrawDialog.accountNumber')}</Label>
                        <Input
                          id="account"
                          placeholder={t('wallet.withdrawDialog.enterAccountNumber')}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="amount">{t('wallet.withdrawDialog.amountLabel')}</Label>
                        <div className="relative">
                          <span className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground font-medium`}>
                            {t('wallet.riyal')}
                          </span>
                          <Input
                            id="amount"
                            type="number"
                            min="100"
                            max={availableForWithdraw}
                            placeholder="0.00"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className={`text-lg font-semibold ${isRTL ? 'pr-14' : 'pl-14'}`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? 'الحد الأدنى: 100 ريال' : 'Minimum: 100 SAR'}
                        </p>
                      </div>
                      
                      <Alert className="bg-warning/10 border-warning/30">
                        <Clock className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-warning">
                          {t('wallet.withdrawDialog.processingNote')}
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        onClick={handleWithdraw} 
                        disabled={isWithdrawing || !withdrawAmount || !selectedBank || !accountNumber}
                        className="w-full bg-success hover:bg-success/90 text-success-foreground"
                        size="lg"
                      >
                        {isWithdrawing ? t('wallet.withdrawDialog.processing') : t('wallet.withdrawDialog.confirmWithdraw')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Total Earnings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-success/10 to-background">
                <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full blur-2xl" />
                <CardContent className="p-6">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">{t('wallet.totalEarnings')}</p>
                      <p className="text-3xl font-bold text-success">
                        +{totalEarnings.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('wallet.riyal')}</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <TrendingUp className="h-7 w-7 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Total Withdrawals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-brand-orange/10 to-background">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/10 rounded-full blur-2xl" />
                <CardContent className="p-6">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">{t('wallet.totalWithdrawals')}</p>
                      <p className="text-3xl font-bold text-brand-orange">
                        -{totalWithdrawn.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('wallet.riyal')}</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <TrendingDown className="h-7 w-7 text-brand-orange" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Profit Report */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card 
                className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-info/10 to-background cursor-pointer" 
                onClick={() => navigate('/earnings-report')}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-info/10 rounded-full blur-2xl" />
                <CardContent className="p-6">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">{t('wallet.profitReport')}</p>
                      <p className="text-lg font-semibold text-foreground">
                        {isRTL ? 'عرض التقرير التفصيلي' : 'View detailed report'}
                      </p>
                      <div className={`flex items-center gap-1 text-info mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-medium">{isRTL ? 'اضغط للعرض' : 'Click to view'}</span>
                        <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-info/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <BarChart3 className="h-7 w-7 text-info" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Expandable Transaction History Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Collapsible open={isTransactionsOpen} onOpenChange={setIsTransactionsOpen}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-dashed border-primary/30 hover:border-primary/60 bg-gradient-to-r from-primary/5 via-background to-primary/5">
                  <CardContent className="p-6">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="relative">
                          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg">
                            <History className="h-8 w-8 text-primary" />
                          </div>
                          <div className="absolute -top-1 -right-1">
                            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                          </div>
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <h3 className="text-xl font-bold text-foreground">
                            {isRTL ? 'سجل المعاملات' : 'Transaction History'}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isRTL 
                              ? `اضغط لعرض ${transactions.length} معاملة` 
                              : `Click to view ${transactions.length} transactions`}
                          </p>
                          <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                              {isRTL ? 'تصدير متاح' : 'Export Available'}
                            </span>
                            <span className="text-xs px-2 py-1 bg-info/10 text-info rounded-full">
                              {isRTL ? 'فلترة متقدمة' : 'Advanced Filters'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-medium text-primary hidden sm:block">
                          {isTransactionsOpen 
                            ? (isRTL ? 'اضغط للإغلاق' : 'Click to collapse') 
                            : (isRTL ? 'اضغط للفتح' : 'Click to expand')}
                        </span>
                        <motion.div
                          animate={{ rotate: isTransactionsOpen ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"
                        >
                          <ChevronDown className="h-5 w-5 text-primary" />
                        </motion.div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <AnimatePresence>
                  {isTransactionsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4"
                    >
                      <TransactionHistory userId={user?.id || ''} userRole={userRole} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>

          {/* Charts Section (always visible) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    {isRTL ? 'نظرة عامة على الأرباح' : 'Earnings Overview'}
                  </h3>
                </div>
                <WalletCharts transactions={transactions} />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default WalletPage;
