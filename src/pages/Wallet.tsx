import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import TransactionHistory from '@/components/Wallet/TransactionHistory';
import WalletCharts from '@/components/Wallet/WalletCharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download,
  Plus,
  Banknote,
  Building,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

const WalletPage = () => {
  const { user, userRole } = useAuth();
  const { t, language } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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
      // Return default wallet structure if no wallet exists
      return data || { balance: 0, total_earned: 0, total_withdrawn: 0 };
    }, [user?.id]),
    enabled: !!user?.id
  });

  // Fetch transactions for charts
  const { data: transactions = [] } = useSupabaseQuery({
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
      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user!.id,
          type: 'withdraw',
          amount: -amount,
          description: `${t('wallet.withdrawMoney')} - ${banks.find(b => b.id === selectedBank)?.name} - ${accountNumber}`,
          status: 'pending'
        });

      if (error) throw error;
      
      toast({
        title: t('success'),
        description: t('wallet.success.withdrawRequested').replace('{amount}', String(amount))
      });
      
      setWithdrawAmount('');
      setSelectedBank('');
      setAccountNumber('');
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: t('error'),
        description: t('wallet.errors.withdrawError'),
        variant: "destructive"
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const exportTransactions = () => {
    toast({
      title: t('success'),
      description: t('wallet.success.exported')
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('wallet.title')}</h1>
              <p className="text-muted-foreground">
                {t('wallet.subtitle')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportTransactions} className="gap-2">
                <Download className="h-4 w-4" />
                {t('wallet.exportTransactions')}
              </Button>
              {(userRole === 'attendee' || userRole === 'provider') && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-2" disabled={availableForWithdraw < 100}>
                      <CreditCard className="h-4 w-4" />
                      {t('wallet.withdrawMoney')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('wallet.withdrawDialog.title')}</DialogTitle>
                      <DialogDescription>
                        {t('wallet.withdrawDialog.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="amount">{t('wallet.withdrawDialog.amountLabel')}</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="100"
                          max={availableForWithdraw}
                          placeholder={t('wallet.enterAmount')}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('wallet.withdrawDialog.availableToWithdraw')}: {availableForWithdraw} {t('wallet.riyal')}
                        </p>
                      </div>
                      
                      <div>
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
                      
                      <div>
                        <Label htmlFor="account">{t('wallet.withdrawDialog.accountNumber')}</Label>
                        <Input
                          id="account"
                          placeholder={t('wallet.withdrawDialog.enterAccountNumber')}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                        />
                      </div>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t('wallet.withdrawDialog.processingNote')}
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        onClick={handleWithdraw} 
                        disabled={isWithdrawing}
                        className="w-full"
                      >
                        {isWithdrawing ? t('wallet.withdrawDialog.processing') : t('wallet.withdrawDialog.confirmWithdraw')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Balance Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('wallet.currentBalance')}</CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {currentBalance.toLocaleString()} {t('wallet.riyal')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('wallet.totalBalance')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('wallet.availableForWithdraw')}</CardTitle>
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {availableForWithdraw.toLocaleString()} {t('wallet.riyal')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('wallet.canWithdrawNow')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('wallet.totalEarnings')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {totalEarnings.toLocaleString()} {t('wallet.riyal')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('wallet.sinceBeginning')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('wallet.totalWithdrawals')}</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {totalWithdrawn.toLocaleString()} {t('wallet.riyal')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('wallet.withdrawn')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {(userRole === 'attendee' || userRole === 'provider') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t('wallet.quickActions')}
                </CardTitle>
                <CardDescription>
                  {t('wallet.quickActionsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Banknote className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{t('wallet.instantTransfer')}</h3>
                          <p className="text-sm text-muted-foreground">{t('wallet.instantTransferDesc')}</p>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('wallet.instantTransfer')}</DialogTitle>
                        <DialogDescription>
                          {t('wallet.instantTransferNote')}
                        </DialogDescription>
                      </DialogHeader>
                      <p className="text-sm">{t('wallet.instantTransferNote')}</p>
                    </DialogContent>
                  </Dialog>
                  
                  <button 
                    onClick={exportTransactions}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-right">
                      <h3 className="font-semibold">{t('wallet.accountStatement')}</h3>
                      <p className="text-sm text-muted-foreground">{t('wallet.accountStatementDesc')}</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => navigate('/earnings-report')}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('wallet.profitReport')}</h3>
                      <p className="text-sm text-muted-foreground">{t('wallet.profitReportDesc')}</p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wallet Charts */}
          <WalletCharts transactions={transactions} />

          {/* Transaction History */}
          <TransactionHistory userId={user?.id} userRole={userRole} />

          {/* Information Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('wallet.withdrawalInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('wallet.withdrawalInfoItem1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('wallet.withdrawalInfoItem2')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('wallet.withdrawalInfoItem3')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('wallet.withdrawalInfoItem4')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('wallet.financialTips')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('wallet.financialTip1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('wallet.financialTip2')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('wallet.financialTip3')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('wallet.financialTip4')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WalletPage;
