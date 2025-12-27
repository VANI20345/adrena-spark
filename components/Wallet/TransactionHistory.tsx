import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Wallet, 
  Search, 
  Filter,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface TransactionHistoryProps {
  userId: string;
  userRole?: 'attendee' | 'provider' | 'admin';
}

const TransactionHistory = ({ userId, userRole }: TransactionHistoryProps) => {
  const { t, isRTL, language } = useLanguageContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch real transactions from database
  const { data: transactions = [], isLoading } = useSupabaseQuery({
    queryKey: ['wallet_transactions', userId],
    queryFn: useCallback(async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }, [userId]),
    enabled: !!userId
  });

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    return filtered;
  }, [transactions, searchTerm, filterType, filterStatus]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
      case 'refund':
      case 'bonus':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'payment':
      case 'commission':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'withdraw':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">{t('wallet.completed')}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('wallet.processing')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('wallet.failed')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline">{t('wallet.cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{t('wallet.unknown')}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'earning': return t('wallet.earning');
      case 'payment': return t('wallet.payment');
      case 'withdraw': return t('wallet.withdraw');
      case 'refund': return t('wallet.refund');
      case 'commission': return t('wallet.commission');
      case 'bonus': return t('wallet.bonus');
      default: return type;
    }
  };

  const calculateTotals = () => {
    const safeTransactions = filteredTransactions || [];
    const totalIncome = safeTransactions
      .filter(t => ['earning', 'refund', 'bonus'].includes(t.type) && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalExpenses = safeTransactions
      .filter(t => ['payment', 'withdraw', 'commission'].includes(t.type) && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return { totalIncome, totalExpenses };
  };

  const { totalIncome, totalExpenses } = calculateTotals();

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const exportTransactions = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return;
    }

    // Create CSV content
    const headers = [t('wallet.date'), t('wallet.description'), t('wallet.transactionType'), t('wallet.status'), t('wallet.amount')];
    const csvRows = [headers.join(',')];
    
    filteredTransactions.forEach(transaction => {
      const row = [
        formatDate(transaction.created_at),
        `"${transaction.description}"`,
        getTypeLabel(transaction.type),
        transaction.status === 'completed' ? t('wallet.completed') : transaction.status === 'pending' ? t('wallet.processing') : t('wallet.failed'),
        transaction.amount
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('wallet.totalIncome')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{totalIncome.toLocaleString()} {t('wallet.riyal')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('wallet.completedOnly')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('wallet.totalExpenses')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{totalExpenses.toLocaleString()} {t('wallet.riyal')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('wallet.includingCommissions')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('wallet.netBalance')}</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalIncome - totalExpenses >= 0 ? '+' : '-'}
              {Math.abs(totalIncome - totalExpenses).toLocaleString()} {t('wallet.riyal')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('wallet.selectedPeriod')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('wallet.transactionHistory')}</CardTitle>
            <Button variant="outline" size="sm" onClick={exportTransactions}>
              <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('wallet.export')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                <Input
                  placeholder={t('wallet.searchTransactions')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('wallet.transactionType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('wallet.allTypes')}</SelectItem>
                <SelectItem value="earning">{t('wallet.earning')}</SelectItem>
                <SelectItem value="payment">{t('wallet.payment')}</SelectItem>
                <SelectItem value="withdraw">{t('wallet.withdraw')}</SelectItem>
                <SelectItem value="refund">{t('wallet.refund')}</SelectItem>
                <SelectItem value="commission">{t('wallet.commission')}</SelectItem>
                <SelectItem value="bonus">{t('wallet.bonus')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('wallet.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('wallet.allStatuses')}</SelectItem>
                <SelectItem value="completed">{t('wallet.completed')}</SelectItem>
                <SelectItem value="pending">{t('wallet.processing')}</SelectItem>
                <SelectItem value="failed">{t('wallet.failed')}</SelectItem>
                <SelectItem value="cancelled">{t('wallet.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <EmptyState 
                icon={Wallet}
                title={t('wallet.noTransactions')}
                description={transactions.length === 0 
                  ? t('wallet.noTransactionsYet')
                  : t('wallet.noMatchingTransactions')
                }
              />
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getTransactionIcon(transaction.type)}
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{transaction.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(transaction.type)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(transaction.created_at)}
                        {transaction.reference_id && (
                          <>
                            <span>•</span>
                            <span>{t('wallet.reference')}: {transaction.reference_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(transaction.status)}
                    <span className={`font-bold text-lg ${
                      transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}
                      {transaction.amount.toLocaleString()} {t('wallet.riyal')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;