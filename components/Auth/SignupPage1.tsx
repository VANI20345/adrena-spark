import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Eye, EyeOff } from 'lucide-react';
import { SignupData } from './SignupFlow';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SignupPage1Props {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onNext: () => void;
}

const SignupPage1 = ({ data, updateData, onNext }: SignupPage1Props) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      // Validate full name
      if (!data.fullName.trim()) {
        setError('الاسم الكامل مطلوب');
        setIsChecking(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.email.trim()) {
        setError('البريد الإلكتروني مطلوب');
        setIsChecking(false);
        return;
      }
      if (!emailRegex.test(data.email)) {
        setError('البريد الإلكتروني غير صالح');
        setIsChecking(false);
        return;
      }

      // Verify email confirmation
      if (data.email !== data.emailVerification) {
        setError('البريد الإلكتروني غير متطابق');
        setIsChecking(false);
        return;
      }

      // Check if email already exists in profiles
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email)
        .maybeSingle();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        setError('حدث خطأ في التحقق من البريد الإلكتروني');
        setIsChecking(false);
        return;
      }

      if (existingEmail) {
        setError('البريد الإلكتروني مستخدم بالفعل');
        setIsChecking(false);
        return;
      }

      // Validate phone number
      if (!data.phone.trim()) {
        setError('رقم الجوال مطلوب');
        setIsChecking(false);
        return;
      }
      
      // Check phone format: must start with 05 and be exactly 10 digits
      const phoneRegex = /^05\d{8}$/;
      if (!phoneRegex.test(data.phone)) {
        setError('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
        setIsChecking(false);
        return;
      }

      // Check if phone number already exists
      const { data: existingPhone } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('phone', data.phone)
        .limit(1);

      if (existingPhone && existingPhone.length > 0) {
        setError('رقم الجوال مستخدم بالفعل');
        setIsChecking(false);
        return;
      }

      // Validate password
      if (data.password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        setIsChecking(false);
        return;
      }

      // Validate account type is selected
      if (!data.role || (data.role !== 'attendee' && data.role !== 'provider')) {
        setError('يجب اختيار نوع الحساب (مشارك أو مقدم خدمة)');
        setIsChecking(false);
        return;
      }

      onNext();
    } catch (err: any) {
      setError('حدث خطأ في التحقق من البيانات');
      console.error('Validation error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <form onSubmit={handleNext} className="space-y-4">
      <div className="space-y-2 text-right">
        <Label htmlFor="fullName" className="text-right block">الاسم الكامل</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="أدخل اسمك الكامل"
          value={data.fullName}
          onChange={(e) => updateData({ fullName: e.target.value })}
          required
          className="text-right"
        />
      </div>

      <div className="space-y-2 text-right">
        <Label htmlFor="email" className="text-right block">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          placeholder="أدخل بريدك الإلكتروني"
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          required
          dir="ltr"
          className="text-right"
        />
      </div>

      <div className="space-y-2 text-right">
        <Label htmlFor="emailVerification" className="text-right block">تأكيد البريد الإلكتروني</Label>
        <Input
          id="emailVerification"
          type="email"
          placeholder="أعد إدخال بريدك الإلكتروني"
          value={data.emailVerification}
          onChange={(e) => updateData({ emailVerification: e.target.value })}
          required
          dir="ltr"
          className="text-right"
        />
      </div>

      <div className="space-y-2 text-right">
        <Label htmlFor="phone" className="text-right block">رقم الجوال</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="05xxxxxxxx"
          value={data.phone}
          onChange={(e) => updateData({ phone: e.target.value })}
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
            placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
            value={data.password}
            onChange={(e) => updateData({ password: e.target.value })}
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

      <div className="space-y-3 text-right">
        <Label className="text-right block">نوع الحساب</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={data.role === 'attendee' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => updateData({ role: 'attendee' })}
          >
            مشارك
          </Button>
          <Button
            type="button"
            variant={data.role === 'provider' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => updateData({ role: 'provider' })}
          >
            مقدم خدمة
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isChecking}>
        {isChecking ? 'جاري التحقق...' : 'التالي'}
      </Button>
    </form>
  );
};

export default SignupPage1;
