import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.75-6-6.15S8.7 5.9 12 5.9c1.9 0 3.15.8 3.87 1.5l2.65-2.55C16.9 3.35 14.7 2.4 12 2.4 6.75 2.4 2.5 6.65 2.5 12s4.25 9.6 9.5 9.6c5.5 0 9.15-3.86 9.15-9.3 0-.63-.07-1.1-.15-1.6H12z"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M16.365 1.43c0 1.14-.42 2.21-1.13 3.03-.77.9-2.02 1.6-3.06 1.51-.13-1.11.44-2.25 1.14-3.02.76-.86 2.06-1.5 3.05-1.52zM20.5 17.09c-.55 1.27-.82 1.83-1.52 2.95-.98 1.55-2.36 3.49-4.07 3.5-1.53.02-1.92-.99-3.99-.98-2.07.01-2.5.99-4.03.97-1.71-.02-3.02-1.77-4-3.33C.94 16.24.65 10.9 3.05 8.02c1.34-1.6 3.44-2.53 5.42-2.53 1.9 0 3.1.98 4.67.98 1.52 0 2.45-1 4.65-1 1.75 0 3.6.95 4.93 2.6-4.33 2.37-3.62 8.57-2.22 9.02z"/>
  </svg>
);

export const SocialAuthPlaceholders: React.FC<{ showSeparator?: boolean }> = ({ showSeparator = true }) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoadingProvider(provider);
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('OAuth error:', err);
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('provider is not enabled')) {
        toast.error(
          isRTL
            ? `مزود ${provider === 'google' ? 'جوجل' : 'أبل'} غير مفعّل بعد. يرجى تفعيله في إعدادات المصادقة.`
            : `${provider === 'google' ? 'Google' : 'Apple'} sign-in is not enabled yet. Enable it in Auth provider settings.`
        );
      } else {
        toast.error(
          isRTL ? 'تعذّر بدء عملية تسجيل الدخول' : 'Could not start sign-in flow'
        );
      }
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={loadingProvider !== null}
          onClick={() => handleOAuth('google')}
        >
          <GoogleIcon />
          {loadingProvider === 'google' ? (isRTL ? 'جارٍ...' : 'Loading...') : (isRTL ? 'جوجل' : 'Google')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={loadingProvider !== null}
          onClick={() => handleOAuth('apple')}
        >
          <AppleIcon />
          {loadingProvider === 'apple' ? (isRTL ? 'جارٍ...' : 'Loading...') : (isRTL ? 'أبل' : 'Apple')}
        </Button>
      </div>

      {showSeparator && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {isRTL ? 'أو' : 'or'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialAuthPlaceholders;
