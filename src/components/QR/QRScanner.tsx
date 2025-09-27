import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { QrCode, CheckCircle, XCircle, Camera, Upload } from 'lucide-react';

interface QRScannerProps {
  eventId: string;
  eventTitle: string;
  onScanSuccess?: (ticket: any) => void;
}

interface CheckInResult {
  success: boolean;
  error?: string;
  message?: string;
  ticket_id?: string;
  checked_in_at?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  eventId, 
  eventTitle, 
  onScanSuccess 
}) => {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check-in mutation
  const checkInMutation = useSupabaseMutation(
    async (ticketId: string) => {
      const { data, error } = await supabase.rpc('check_in_attendee', {
        ticket_id: ticketId,
        organizer_id: user?.id,
        location: 'Event entrance'
      });

      if (error) throw error;
      return { data: data as unknown as CheckInResult, error: null };
    },
    {
      onSuccess: (result) => {
        // result is the CheckInResult object from data property
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          toast({
            title: t('success', 'تم بنجاح!'),
            description: t('checkInSuccess', 'تم تسجيل الحضور بنجاح'),
          });
          setScanResult({ ...result, type: 'success' });
          onScanSuccess?.(result);
        } else {
          const errorMsg = (result && typeof result === 'object' && 'error' in result) 
            ? result.error 
            : 'حدث خطأ';
          toast({
            title: t('error', 'خطأ'),
            description: errorMsg,
            variant: 'destructive'
          });
          setScanResult({ error: errorMsg, type: 'error' });
        }
      }
    }
  );

  const handleScanFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For demo purposes, simulate QR scanning from file
    // In production, you would use a proper QR code reader library
    const reader = new FileReader();
    reader.onload = () => {
      // Real QR code processing would happen here
      // For now, we'll show an error message
      toast({
        title: 'خدمة مؤقتة غير متاحة',
        description: 'معالجة رموز QR من الصور ستكون متاحة قريباً',
        variant: 'destructive'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleManualScan = () => {
    // Real QR scanning would require camera access and QR code library
    toast({
      title: 'خدمة مؤقتة غير متاحة',
      description: 'مسح رموز QR من الكاميرا سيكون متاحاً قريباً',
      variant: 'destructive'
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {t('qrScanner', 'ماسح رمز QR')}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {eventTitle}
          </p>
          
          {/* Scan buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleManualScan}
              disabled={checkInMutation.isLoading}
              className="w-full gap-2"
            >
              <Camera className="h-4 w-4" />
              {checkInMutation.isLoading ? t('scanning', 'جاري المسح...') : t('scanQR', 'مسح رمز QR')}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={checkInMutation.isLoading}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('uploadQR', 'رفع صورة رمز QR')}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScanFromFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Scan result */}
        {scanResult && (
          <Alert className={scanResult.type === 'success' ? 'border-green-500' : 'border-red-500'}>
            <div className="flex items-center gap-2">
              {scanResult.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                {scanResult.message || scanResult.error}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• امسح رمز QR من تذكرة المشارك</p>
          <p>• أو ارفع صورة للرمز من المعرض</p>
          <p>• سيتم تسجيل الحضور تلقائياً</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRScanner;