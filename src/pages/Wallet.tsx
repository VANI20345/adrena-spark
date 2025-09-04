import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const WalletPage = () => {
  const { userRole } = useAuth();

  const transactions = [
    {
      id: 1,
      type: 'income',
      amount: 450,
      description: 'دفع من فعالية "رحلة جبلية"',
      date: '2024-01-15',
      status: 'completed'
    },
    {
      id: 2,
      type: 'expense',
      amount: 50,
      description: 'عمولة المنصة (10%)',
      date: '2024-01-15',
      status: 'completed'
    },
    {
      id: 3,
      type: 'withdraw',
      amount: 300,
      description: 'سحب إلى الحساب البنكي',
      date: '2024-01-10',
      status: 'pending'
    }
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'expense':
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
        return <Badge variant="default">مكتمل</Badge>;
      case 'pending':
        return <Badge variant="secondary">قيد المعالجة</Badge>;
      case 'failed':
        return <Badge variant="destructive">فشل</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">المحفظة</h1>
            <Button className="gap-2">
              <CreditCard className="h-4 w-4" />
              سحب الأموال
            </Button>
          </div>

          {/* Balance Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الرصيد الحالي</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">1,250 ريال</div>
                <p className="text-xs text-muted-foreground">
                  متاح للسحب
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,750 ريال</div>
                <p className="text-xs text-muted-foreground">
                  هذا الشهر
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">العمولة المدفوعة</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">275 ريال</div>
                <p className="text-xs text-muted-foreground">
                  10% من الأرباح
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>العمليات المالية</CardTitle>
              <CardDescription>
                آخر العمليات على محفظتك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(transaction.status)}
                      <span className={`font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{transaction.amount} ريال
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Instructions */}
          {(userRole === 'organizer' || userRole === 'provider') && (
            <Card>
              <CardHeader>
                <CardTitle>معلومات السحب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• يتم سحب العمولة 10% تلقائياً من كل عملية دفع</p>
                  <p>• يمكنك سحب الأموال إلى حسابك البنكي في أي وقت</p>
                  <p>• مدة معالجة السحب: 1-3 أيام عمل</p>
                  <p>• الحد الأدنى للسحب: 100 ريال</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WalletPage;