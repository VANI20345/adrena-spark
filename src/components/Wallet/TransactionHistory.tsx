import React, { useState } from 'react';
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

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'withdraw' | 'refund' | 'commission' | 'bonus';
  amount: number;
  description: string;
  date: Date;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  referenceId?: string;
  commission?: number;
  eventName?: string;
}

interface TransactionHistoryProps {
  userId: string;
  userRole?: 'attendee' | 'organizer' | 'provider';
}

export const TransactionHistory = ({ userId, userRole }: TransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'income',
      amount: 450,
      description: 'دفع من حجز فعالية "رحلة جبلية مثيرة"',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'completed',
      eventName: 'رحلة جبلية مثيرة',
      commission: 45
    },
    {
      id: '2',
      type: 'commission',
      amount: -45,
      description: 'عمولة المنصة (10%) - رحلة جبلية مثيرة',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'completed',
      referenceId: '1'
    },
    {
      id: '3',
      type: 'withdraw',
      amount: -300,
      description: 'سحب إلى الحساب البنكي ****1234',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'pending'
    },
    {
      id: '4',
      type: 'expense',
      amount: -125,
      description: 'حجز فعالية "ورشة طبخ إيطالي"',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: '5',
      type: 'bonus',
      amount: 25,
      description: 'مكافأة نقاط الولاء - خصم 25 ريال',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'completed'
    },
    {
      id: '6',
      type: 'refund',
      amount: 200,
      description: 'استرداد لإلغاء فعالية "رحلة الصحراء"',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      status: 'completed'
    }
  ]);

  const [filteredTransactions, setFilteredTransactions] = useState(transactions);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter transactions
  React.useEffect(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.eventName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, filterType, filterStatus, transactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'expense':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'withdraw':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'refund':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'commission':
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case 'bonus':
        return <Wallet className="h-4 w-4 text-green-500" />;
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
      case 'income': return 'دخل';
      case 'expense': return 'مصروف';
      case 'withdraw': return 'سحب';
      case 'refund': return 'استرداد';
      case 'commission': return 'عمولة';
      case 'bonus': return 'مكافأة';
      default: return type;
    }
  };

  const calculateTotals = () => {
    const totalIncome = filteredTransactions
      .filter(t => ['income', 'refund', 'bonus'].includes(t.type) && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = Math.abs(filteredTransactions
      .filter(t => ['expense', 'withdraw', 'commission'].includes(t.type) && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0));

    return { totalIncome, totalExpenses };
  };

  const { totalIncome, totalExpenses } = calculateTotals();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const exportTransactions = () => {
    // In a real app, this would generate and download a CSV/PDF
    console.log('Exporting transactions...', filteredTransactions);
  };

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
                <SelectItem value="income">دخل</SelectItem>
                <SelectItem value="expense">مصروف</SelectItem>
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
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد معاملات مطابقة للفلتر المحدد</p>
              </div>
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
                        {formatDate(transaction.date)}
                        {transaction.referenceId && (
                          <>
                            <span>•</span>
                            <span>مرجع: {transaction.referenceId}</span>
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