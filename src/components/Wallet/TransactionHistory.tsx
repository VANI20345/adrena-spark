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

interface TransactionHistoryProps {
  userId: string;
  userRole?: 'attendee' | 'provider' | 'admin';
}

const TransactionHistory = ({ userId, userRole }: TransactionHistoryProps) => {
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
        return <Badge variant="default" className="bg-green-500">مكتمل</Badge>;
      case 'pending':
        return <Badge variant="secondary">قيد المعالجة</Badge>;
      case 'failed':
        return <Badge variant="destructive">فشل</Badge>;
      case 'cancelled':
        return <Badge variant="outline">ملغي</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'earning': return 'ربح';
      case 'payment': return 'دفع';
      case 'withdraw': return 'سحب';
      case 'refund': return 'استرداد';
      case 'commission': return 'عمولة';
      case 'bonus': return 'مكافأة';
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
    return new Intl.DateTimeFormat('ar-SA', {
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
    const headers = ['التاريخ', 'الوصف', 'النوع', 'الحالة', 'المبلغ'];
    const csvRows = [headers.join(',')];
    
    filteredTransactions.forEach(transaction => {
      const row = [
        formatDate(transaction.created_at),
        `"${transaction.description}"`,
        getTypeLabel(transaction.type),
        transaction.status === 'completed' ? 'مكتمل' : transaction.status === 'pending' ? 'قيد المعالجة' : 'فشل',
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الدخل</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{totalIncome.toLocaleString()} ريال
            </div>
            <p className="text-xs text-muted-foreground">
              العمليات المكتملة فقط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{totalExpenses.toLocaleString()} ريال
            </div>
            <p className="text-xs text-muted-foreground">
              شامل العمولات والسحوبات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الصافي</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalIncome - totalExpenses >= 0 ? '+' : '-'}
              {Math.abs(totalIncome - totalExpenses).toLocaleString()} ريال
            </div>
            <p className="text-xs text-muted-foreground">
              الفترة المحددة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>تاريخ المعاملات</CardTitle>
            <Button variant="outline" size="sm" onClick={exportTransactions}>
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المعاملات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نوع المعاملة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="earning">ربح</SelectItem>
                <SelectItem value="payment">دفع</SelectItem>
                <SelectItem value="withdraw">سحب</SelectItem>
                <SelectItem value="refund">استرداد</SelectItem>
                <SelectItem value="commission">عمولة</SelectItem>
                <SelectItem value="bonus">مكافأة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="pending">قيد المعالجة</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <EmptyState 
                icon={Wallet}
                title="لا توجد معاملات"
                description={transactions.length === 0 
                  ? "لم تتم أي معاملات مالية بعد"
                  : "لا توجد معاملات مطابقة للفلتر المحدد"
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
                            <span>مرجع: {transaction.reference_id}</span>
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
                      {transaction.amount.toLocaleString()} ريال
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