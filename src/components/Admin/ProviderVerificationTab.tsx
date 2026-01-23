import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Download, CheckCircle, XCircle, Clock, 
  ExternalLink, MapPin, Briefcase, Mail, Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguageContext } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ProviderVerificationTabProps {
  providers: any[];
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
  loading?: boolean;
}

export const ProviderVerificationTab = ({ 
  providers, 
  onApprove, 
  onReject,
  loading 
}: ProviderVerificationTabProps) => {
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const { language, isRTL } = useLanguageContext();

  const pendingProviders = providers.filter(p => p.verification_status === 'pending');

  const handleViewDetails = (provider: any) => {
    setSelectedProvider(provider);
  };

  const handleRejectClick = (provider: any) => {
    setSelectedProvider(provider);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedProvider || !rejectReason.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال سبب الرفض' : 'Please enter a rejection reason');
      return;
    }
    
    setRejecting(true);
    try {
      await onReject(selectedProvider.user_id, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedProvider(null);
    } finally {
      setRejecting(false);
    }
  };

  const openDocument = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error(language === 'ar' ? 'لا يوجد مستند' : 'No document available');
    }
  };

  if (loading) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <Briefcase className="h-5 w-5" />
            <span>{language === 'ar' ? 'طلبات التحقق من مقدمي الخدمات' : 'Service Provider Verification Requests'}</span>
            <Badge variant="secondary" className={isRTL ? 'mr-auto' : 'ml-auto'}>
              {pendingProviders.length} {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingProviders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'ar' ? 'لا توجد طلبات تحقق قيد الانتظار' : 'No pending verification requests'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingProviders.map((provider) => (
                <div 
                  key={provider.user_id} 
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Provider Info */}
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{provider.full_name}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span dir="ltr">{provider.email}</span>
                          </div>
                          {provider.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span dir="ltr">{provider.phone}</span>
                            </div>
                          )}
                          {provider.city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{provider.city}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Service Types */}
                      {provider.service_types && provider.service_types.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {language === 'ar' ? 'نوع الخدمات:' : 'Service Types:'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {provider.service_types.map((service: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Address */}
                      {provider.address && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {language === 'ar' ? 'العنوان:' : 'Address:'}
                          </p>
                          <p className="text-sm">{provider.address}</p>
                        </div>
                      )}

                      {/* Documents */}
                      <div className="flex flex-wrap gap-2">
                        {provider.id_document_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocument(provider.id_document_url)}
                            className="text-xs"
                          >
                            <FileText className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'صورة الهوية' : 'ID Document'}
                            <ExternalLink className={`h-3 w-3 ${isRTL ? 'mr-1' : 'ml-1'}`} />
                          </Button>
                        )}
                        {provider.commercial_registration_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocument(provider.commercial_registration_url)}
                            className="text-xs"
                          >
                            <FileText className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'السجل التجاري' : 'Commercial Registration'}
                            <ExternalLink className={`h-3 w-3 ${isRTL ? 'mr-1' : 'ml-1'}`} />
                          </Button>
                        )}
                        {provider.license_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocument(provider.license_url)}
                            className="text-xs"
                          >
                            <FileText className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'الرخصة / التصريح' : 'License / Permit'}
                            <ExternalLink className={`h-3 w-3 ${isRTL ? 'mr-1' : 'ml-1'}`} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => onApprove(provider.user_id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                        {language === 'ar' ? 'قبول' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick(provider)}
                      >
                        <XCircle className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                        {language === 'ar' ? 'رفض' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'رفض طلب التحقق' : 'Reject Verification Request'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'سيتم إرسال إشعار بالبريد الإلكتروني للمستخدم مع سبب الرفض'
                : 'An email notification will be sent to the user with the rejection reason'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">
                {language === 'ar' ? 'سبب الرفض *' : 'Rejection Reason *'}
              </Label>
              <Textarea
                id="reason"
                placeholder={language === 'ar' ? 'اكتب سبب رفض الطلب...' : 'Enter the reason for rejection...'}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <div className={`flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
              <Button 
                variant="outline" 
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason('');
                }}
                disabled={rejecting}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting 
                  ? (language === 'ar' ? 'جاري الرفض...' : 'Rejecting...') 
                  : (language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
