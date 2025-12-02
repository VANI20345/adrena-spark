import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import jsQR from 'jsqr';
import { 
  QrCode, 
  Scan, 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar, 
  MapPin,
  Download,
  History,
  AlertTriangle,
  Flashlight,
  RotateCcw,
  Settings
} from 'lucide-react';

interface TicketData {
  id: string;
  eventId: string;
  eventTitle: string;
  eventTitle_ar: string;
  holderName: string;
  ticketNumber: string;
  qrCode: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  checkedIn: boolean;
  checkedInAt?: Date;
  checkedInBy?: string;
  eventDate: Date;
  eventLocation: string;
  eventLocation_ar: string;
  seatNumber?: string;
  ticketType: string;
  price: number;
}

interface ScanResult {
  id: string;
  ticketData: TicketData | null;
  timestamp: Date;
  success: boolean;
  error?: string;
  scannedBy: string;
}

interface SmartQRScannerProps {
  eventId?: string;
  onScanResult?: (result: ScanResult) => void;
  allowManualEntry?: boolean;
  showHistory?: boolean;
  organizerMode?: boolean;
}

const SmartQRScanner: React.FC<SmartQRScannerProps> = ({
  eventId,
  onScanResult,
  allowManualEntry = true,
  showHistory = true,
  organizerMode = false
}) => {
  const { t, isRTL } = useLanguageContext();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [currentTicket, setCurrentTicket] = useState<TicketData | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner');
  
  // Mock ticket data for demonstration
  const mockTickets: TicketData[] = [
    {
      id: '1',
      eventId: 'event-1',
      eventTitle: 'Tuwaiq Mountain Hiking',
      eventTitle_ar: 'هايكنج جبل طويق',
      holderName: 'أحمد محمد',
      ticketNumber: 'TMH-001-2024',
      qrCode: 'QR-TMH-001-2024-12345',
      status: 'active',
      checkedIn: false,
      eventDate: new Date('2024-03-15T08:00:00'),
      eventLocation: 'Tuwaiq Mountain Base',
      eventLocation_ar: 'قاعدة جبل طويق',
      ticketType: 'Standard',
      price: 200
    },
    {
      id: '2',
      eventId: 'event-2',
      eventTitle: 'Red Sea Diving',
      eventTitle_ar: 'غوص البحر الأحمر',
      holderName: 'فاطمة علي',
      ticketNumber: 'RSD-002-2024',
      qrCode: 'QR-RSD-002-2024-67890',
      status: 'active',
      checkedIn: true,
      checkedInAt: new Date('2024-03-18T09:30:00'),
      checkedInBy: 'Scanner Admin',
      eventDate: new Date('2024-03-18T10:00:00'),
      eventLocation: 'Jeddah Marina',
      eventLocation_ar: 'مارينا جدة',
      ticketType: 'Premium',
      price: 350
    }
  ];

  useEffect(() => {
    checkCameraAvailability();
    loadScanHistory();
  }, []);

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      setHasCamera(hasVideoInput);
      
      if (!hasVideoInput) {
        setCameraError(t('noCameraFound'));
      }
    } catch (error) {
      setCameraError(t('cameraAccessError'));
      setHasCamera(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        startScanning();
      }
    } catch (error) {
      setCameraError(t('cameraPermissionDenied'));
      toast({
        title: t('cameraError'),
        description: t('cameraPermissionDenied'),
        variant: 'destructive'
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const startScanning = () => {
    const scanInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current && isScanning) {
        scanFrame();
      } else {
        clearInterval(scanInterval);
      }
    }, 1000); // Scan every second
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Real QR code detection using jsQR
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (qrCode) {
      processQRCode(qrCode.data);
    }
  };

  const processQRCode = async (qrCode: string) => {
    setIsScanning(false);
    stopCamera();

    // Find ticket by QR code
    const ticket = mockTickets.find(t => t.qrCode === qrCode);
    
    const result: ScanResult = {
      id: Date.now().toString(),
      ticketData: ticket || null,
      timestamp: new Date(),
      success: !!ticket,
      error: ticket ? undefined : t('invalidTicket'),
      scannedBy: 'Current User'
    };

    if (ticket) {
      // Check if ticket is valid for check-in
      if (ticket.status !== 'active') {
        result.success = false;
        result.error = t(`ticketStatus_${ticket.status}`);
      } else if (ticket.checkedIn) {
        result.success = false;
        result.error = t('ticketAlreadyUsed');
      } else if (eventId && ticket.eventId !== eventId) {
        result.success = false;
        result.error = t('ticketWrongEvent');
      } else {
        // Valid ticket - mark as checked in
        ticket.checkedIn = true;
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = 'Scanner User';
        setCurrentTicket(ticket);
        
        toast({
          title: t('scanSuccess'),
          description: t('ticketValidated'),
        });
      }
    } else {
      toast({
        title: t('scanFailed'),
        description: result.error,
        variant: 'destructive'
      });
    }

    // Add to scan history
    setScanHistory(prev => [result, ...prev]);
    onScanResult?.(result);
  };

  const processManualCode = () => {
    if (!manualCode.trim()) {
      toast({
        title: t('error'),
        description: t('enterTicketCode'),
        variant: 'destructive'
      });
      return;
    }

    processQRCode(manualCode.trim());
    setManualCode('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast({
      title: t('fileUploaded'),
      description: t('processingImage'),
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (qrCode) {
          processQRCode(qrCode.data);
        } else {
          toast({
            title: t('noQRFound'),
            description: t('noQRFoundInImage'),
            variant: 'destructive'
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const loadScanHistory = () => {
    // Load scan history from localStorage or API
    const stored = localStorage.getItem('qr_scan_history');
    if (stored) {
      setScanHistory(JSON.parse(stored));
    }
  };

  const saveScanHistory = () => {
    localStorage.setItem('qr_scan_history', JSON.stringify(scanHistory));
  };

  const exportScanHistory = () => {
    const data = scanHistory.map(scan => ({
      timestamp: scan.timestamp.toISOString(),
      success: scan.success,
      ticketNumber: scan.ticketData?.ticketNumber || 'N/A',
      holderName: scan.ticketData?.holderName || 'N/A',
      error: scan.error || 'None'
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_history_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    saveScanHistory();
  }, [scanHistory]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            {t('qrScanner')}
            {organizerMode && (
              <Badge variant="secondary">{t('organizerMode')}</Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanner">{t('scanner')}</TabsTrigger>
          <TabsTrigger value="manual">{t('manualEntry')}</TabsTrigger>
          {showHistory && (
            <TabsTrigger value="history">{t('history')}</TabsTrigger>
          )}
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Camera View */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('cameraScanner')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera Controls */}
                <div className="flex items-center gap-2 mb-4">
                  {!isScanning ? (
                    <Button 
                      onClick={startCamera} 
                      disabled={!hasCamera}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {t('startCamera')}
                    </Button>
                  ) : (
                    <Button onClick={stopCamera} variant="destructive" className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />
                      {t('stopCamera')}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFlashEnabled(!flashEnabled)}
                  >
                    <Flashlight className={`w-4 h-4 ${flashEnabled ? 'text-yellow-500' : ''}`} />
                  </Button>
                </div>

                {/* Camera View */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  
                  {/* Scanning Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-primary rounded-lg w-64 h-64 relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                        
                        {/* Scanning Line Animation */}
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary animate-pulse"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* No Camera Message */}
                  {!hasCamera && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
                      <div>
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-lg font-medium">{t('noCameraAvailable')}</p>
                        <p className="text-sm opacity-75">{cameraError}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload from File */}
                <div className="space-y-2">
                  <Label>{t('uploadQRImage')}</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('chooseFile')}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Ticket Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('ticketInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentTicket ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {isRTL ? currentTicket.eventTitle_ar : currentTicket.eventTitle}
                      </h3>
                      <Badge className={getStatusColor(currentTicket.status)}>
                        {t(`ticketStatus_${currentTicket.status}`)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{currentTicket.holderName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{currentTicket.eventDate.toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{isRTL ? currentTicket.eventLocation_ar : currentTicket.eventLocation}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{currentTicket.ticketNumber}</span>
                      </div>
                    </div>

                    {currentTicket.checkedIn && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">{t('checkedIn')}</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          {t('checkedInAt')}: {currentTicket.checkedInAt?.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scan className="w-12 h-12 mx-auto mb-4" />
                    <p>{t('scanTicketToView')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('manualTicketEntry')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualCode">{t('ticketCodeOrQR')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="manualCode"
                    placeholder={t('enterCodePlaceholder')}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && processManualCode()}
                    className="flex-1"
                  />
                  <Button onClick={processManualCode} disabled={!manualCode.trim()}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('validate')}
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>{t('manualEntryHelp')}</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t('enterTicketNumber')}</li>
                  <li>{t('enterQRCodeValue')}</li>
                  <li>{t('useForOfflineValidation')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        {showHistory && (
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    {t('scanHistory')}
                    <Badge variant="secondary">{scanHistory.length}</Badge>
                  </CardTitle>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportScanHistory}>
                      <Download className="w-4 h-4 mr-2" />
                      {t('export')}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setScanHistory([])}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {t('clear')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {scanHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4" />
                    <p>{t('noScanHistory')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scanHistory.map((scan) => (
                      <div
                        key={scan.id}
                        className={`p-4 rounded-lg border ${
                          scan.success 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {scan.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            
                            <div className="space-y-1">
                              <p className="font-medium">
                                {scan.ticketData 
                                  ? (isRTL ? scan.ticketData.eventTitle_ar : scan.ticketData.eventTitle)
                                  : t('unknownTicket')
                                }
                              </p>
                              
                              {scan.ticketData && (
                                <div className="text-sm text-muted-foreground">
                                  <p>{scan.ticketData.holderName} • {scan.ticketData.ticketNumber}</p>
                                </div>
                              )}
                              
                              {scan.error && (
                                <p className="text-sm text-red-600">{scan.error}</p>
                              )}
                              
                              <p className="text-xs text-muted-foreground">
                                {scan.timestamp.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          <Badge 
                            variant={scan.success ? "default" : "destructive"}
                            className="ml-2"
                          >
                            {scan.success ? t('valid') : t('invalid')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SmartQRScanner;