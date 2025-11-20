import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SignupFlow from '@/components/Auth/SignupFlow';
import { toast } from 'sonner';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isInSignupFlow, setIsInSignupFlow] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('بيانات الدخول غير صحيحة');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        setError('حدث خطأ في تسجيل الدخول بـ Google');
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) throw error;

      setResetSuccess(true);
    } catch (err: any) {
      toast.error('حدث خطأ في إرسال رسالة استعادة كلمة المرور');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSuccess(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="absolute top-2 left-2"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            الرجوع للرئيسية
          </Button>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'ادخل بياناتك للوصول إلى حسابك' 
              : 'أنشئ حساباً جديداً للبدء في استكشاف الفعاليات'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(value) => setIsLogin(value === 'login')}>
            {!isInSignupFlow && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
              </TabsList>
            )}
            
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-4">
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full"
                  type="button"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  تسجيل الدخول بـ Google
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">أو</span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="email" className="text-right block">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="أدخل بريدك الإلكتروني"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="text-right"
                    />
                  </div>
                  
                  <div className="space-y-2 text-right">
                    <Label htmlFor="password" className="text-right block">كلمة المرور</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="أدخل كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        dir="ltr"
                        className="pl-10 text-right"
                      />
                      <button
                        type="button"
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      نسيت كلمة المرور؟
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'جاري التحميل...' : 'تسجيل الدخول'}
                  </Button>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <SignupFlow onFlowStart={() => setIsInSignupFlow(true)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={handleCloseForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">استعادة كلمة المرور</DialogTitle>
            <DialogDescription className="text-right">
              {resetSuccess 
                ? 'تم إرسال رابط استعادة كلمة المرور بنجاح'
                : 'أدخل بريدك الإلكتروني وسنرسل لك رسالة لتحديث كلمة المرور'
              }
            </DialogDescription>
          </DialogHeader>
          
          {resetSuccess ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-right text-green-800">
                  تم إرسال رسالة بنجاح إلى بريدك الإلكتروني <strong>{resetEmail}</strong>. 
                  يرجى التحقق من صندوق الوارد الخاص بك واتباع التعليمات لإعادة تعيين كلمة المرور.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleCloseForgotPassword}
                className="w-full"
              >
                حسناً
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2 text-right">
                <Label htmlFor="reset-email" className="text-right block">البريد الإلكتروني</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForgotPassword}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isResetting} className="flex-1">
                  {isResetting ? 'جاري الإرسال...' : 'إرسال'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
