import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface QRCodeGeneratorProps {
  eventId: string;
  eventTitle: string;
  organizerId: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  eventId, 
  eventTitle, 
  organizerId 
}) => {
  const { t } = useLanguageContext();
  
  const qrValue = `${window.location.origin}/event/${eventId}/checkin?organizer=${organizerId}`;

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${eventTitle}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR كود فعالية: ${eventTitle}`,
          text: 'استخدم هذا الكود لتسجيل الحضور',
          url: qrValue,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(qrValue);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {t('qrCode', 'رمز QR للحضور')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="p-4 bg-white rounded-lg">
          <QRCodeSVG
            id="qr-code-svg"
            value={qrValue}
            size={200}
            level="M"
            includeMargin
          />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {eventTitle}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('scanToCheckIn', 'امسح لتسجيل الحضور')}
          </p>
        </div>

        <div className="flex space-x-2 w-full">
          <Button 
            onClick={downloadQR} 
            variant="outline" 
            className="flex-1"
          >
            <Download className="w-4 h-4 ml-2" />
            {t('download', 'تحميل')}
          </Button>
          <Button 
            onClick={shareQR} 
            variant="outline" 
            className="flex-1"
          >
            <Share2 className="w-4 h-4 ml-2" />
            {t('share', 'مشاركة')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;