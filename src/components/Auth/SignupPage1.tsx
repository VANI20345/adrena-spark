import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Eye, EyeOff } from 'lucide-react';
import { SignupData } from './SignupFlow';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface SignupPage1Props {
  data: SignupData;
  updateData: (data: Partial<SignupData>) => void;
  onNext: () => void;
}

const SignupPage1 = ({ data, updateData, onNext }: SignupPage1Props) => {
  const { toggles } = useFeatureToggles();
  const { isRTL } = useLanguageContext();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const align = isRTL ? 'text-right' : 'text-left';
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const providerSignupEnabled = toggles?.provider_signup !== false;

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      if (!data.fullName.trim()) {
        setError(L('الاسم الكامل مطلوب', 'Full name is required'));
        setIsChecking(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.email.trim()) {
        setError(L('البريد الإلكتروني مطلوب', 'Email is required'));
        setIsChecking(false);
        return;
      }
      if (!emailRegex.test(data.email)) {
        setError(L('البريد الإلكتروني غير صالح', 'Invalid email format'));
        setIsChecking(false);
        return;
      }

      if (data.email !== data.emailVerification) {
        setError(L('البريد الإلكتروني غير متطابق', 'Emails do not match'));
        setIsChecking(false);
        return;
      }

      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', data.email)
        .maybeSingle();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        setError(L('حدث خطأ في التحقق من البريد الإلكتروني', 'Failed to verify email availability'));
        setIsChecking(false);
        return;
      }

      if (existingEmail) {
        setError(L('البريد الإلكتروني مستخدم بالفعل', 'This email is already registered'));
        setIsChecking(false);
        return;
      }

      if (!data.phone.trim()) {
        setError(L('رقم الجوال مطلوب', 'Phone number is required'));
        setIsChecking(false);
        return;
      }

      const phoneRegex = /^05\d{8}$/;
      if (!phoneRegex.test(data.phone)) {
        setError(L('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
          'Phone must start with 05 and be exactly 10 digits'));
        setIsChecking(false);
        return;
      }

      const { data: existingPhone } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('phone', data.phone)
        .limit(1);

      if (existingPhone && existingPhone.length > 0) {
        setError(L('رقم الجوال مستخدم بالفعل', 'This phone number is already in use'));
        setIsChecking(false);
        return;
      }

      if (data.password.length < 6) {
        setError(L('كلمة المرور يجب أن تكون 6 أحرف على الأقل',
          'Password must be at least 6 characters'));
        setIsChecking(false);
        return;
      }

      if (data.password !== (data as any).passwordConfirmation) {
        setError(L('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
        setIsChecking(false);
        return;
      }

      const effectiveRole = providerSignupEnabled ? data.role : 'attendee';
      if (!providerSignupEnabled && data.role !== 'attendee') {
        updateData({ role: 'attendee' });
      }

      if (!effectiveRole || (effectiveRole !== 'attendee' && effectiveRole !== 'provider')) {
        setError(L('يجب اختيار نوع الحساب', 'You must select an account type'));
        setIsChecking(false);
        return;
      }

      onNext();
    } catch (err: any) {
      setError(L('حدث خطأ في التحقق من البيانات', 'Failed to validate data'));
      console.error('Validation error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <form onSubmit={handleNext} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="fullName" className={`${align} block`}>{L('الاسم الكامل', 'Full name')}</Label>
        <Input
          id="fullName"
          type="text"
          placeholder={L('أدخل اسمك الكامل', 'Enter your full name')}
          value={data.fullName}
          onChange={(e) => updateData({ fullName: e.target.value })}
          required
          className={align}
        />
      </div>

      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="email" className={`${align} block`}>{L('البريد الإلكتروني', 'Email')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={L('أدخل بريدك الإلكتروني', 'Enter your email')}
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          required
          dir="ltr"
          className={align}
        />
      </div>

      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="emailVerification" className={`${align} block`}>{L('تأكيد البريد الإلكتروني', 'Confirm email')}</Label>
        <Input
          id="emailVerification"
          type="email"
          placeholder={L('أعد إدخال بريدك الإلكتروني', 'Re-enter your email')}
          value={data.emailVerification}
          onChange={(e) => updateData({ emailVerification: e.target.value })}
          required
          dir="ltr"
          className={align}
        />
      </div>

      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="phone" className={`${align} block`}>{L('رقم الجوال', 'Phone number')}</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="05xxxxxxxx"
          value={data.phone}
          onChange={(e) => updateData({ phone: e.target.value })}
          required
          dir="ltr"
          className={align}
        />
      </div>

      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="password" className={`${align} block`}>{L('كلمة المرور', 'Password')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={L('أدخل كلمة المرور (6 أحرف على الأقل)', 'Enter password (at least 6 characters)')}
            value={data.password}
            onChange={(e) => updateData({ password: e.target.value })}
            required
            dir="ltr"
            className={`${isRTL ? 'pl-10' : 'pr-10'} ${align}`}
          />
          <button
            type="button"
            className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded`}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      <div className={`space-y-2 ${align}`}>
        <Label htmlFor="passwordConfirmation" className={`${align} block`}>{L('تأكيد كلمة المرور', 'Confirm password')}</Label>
        <div className="relative">
          <Input
            id="passwordConfirmation"
            type={showPasswordConfirm ? 'text' : 'password'}
            placeholder={L('أعد إدخال كلمة المرور', 'Re-enter your password')}
            value={(data as any).passwordConfirmation || ''}
            onChange={(e) => updateData({ passwordConfirmation: e.target.value } as any)}
            required
            dir="ltr"
            className={`${isRTL ? 'pl-10' : 'pr-10'} ${align}`}
          />
          <button
            type="button"
            className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded`}
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
          >
            {showPasswordConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {providerSignupEnabled ? (
        <div className={`space-y-3 ${align}`}>
          <Label className={`${align} block`}>{L('نوع الحساب', 'Account type')}</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={data.role === 'attendee' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => updateData({ role: 'attendee' })}
            >
              {L('مشارك', 'Attendee')}
            </Button>
            <Button
              type="button"
              variant={data.role === 'provider' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => updateData({ role: 'provider' })}
            >
              {L('مقدم خدمة', 'Service provider')}
            </Button>
          </div>
        </div>
      ) : (
        <input type="hidden" value="attendee" onChange={() => {}} />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isChecking}>
        {isChecking ? L('جاري التحقق...', 'Verifying...') : L('التالي', 'Next')}
      </Button>
    </form>
  );
};

export default SignupPage1;
