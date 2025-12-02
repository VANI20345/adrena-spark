import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Download, CheckCircle, XCircle, Clock, 
  ExternalLink, MapPin, Briefcase, Mail, Phone
} from 'lucide-react';
import { toast } from 'sonner';
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
      toast.error('يرجى إدخال سبب الرفض');
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
      toast.error('لا يوجد مستند');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            طلبات التحقق من مقدمي الخدمات
            <Badge variant="secondary" className="mr-auto">
              {pendingProviders.length} قيد الانتظار
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingProviders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات تحقق قيد الانتظار</p>
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
                          <p className="text-xs text-muted-foreground mb-1">نوع الخدمات:</p>
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
                          <p className="text-xs text-muted-foreground mb-1">العنوان:</p>
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
                            <FileText className="h-3 w-3 ml-1" />
                            صورة الهوية
                            <ExternalLink className="h-3 w-3 mr-1" />
                          </Button>
                        )}
                        {provider.commercial_registration_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocument(provider.commercial_registration_url)}
                            className="text-xs"
                          >
                            <FileText className="h-3 w-3 ml-1" />
                            السجل التجاري
                            <ExternalLink className="h-3 w-3 mr-1" />
                          </Button>
                        )}
                        {provider.license_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDocument(provider.license_url)}
                            className="text-xs"
                          >
                            <FileText className="h-3 w-3 ml-1" />
                            الرخصة / التصريح
                            <ExternalLink className="h-3 w-3 mr-1" />
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
                        <CheckCircle className="h-4 w-4 ml-1" />
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick(provider)}
                      >
                        <XCircle className="h-4 w-4 ml-1" />
                        رفض
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب التحقق</DialogTitle>
            <DialogDescription>
              سيتم إرسال إشعار بالبريد الإلكتروني للمستخدم مع سبب الرفض
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">سبب الرفض *</Label>
              <Textarea
                id="reason"
                placeholder="اكتب سبب رفض الطلب..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason('');
                }}
                disabled={rejecting}
              >
                إلغاء
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting ? 'جاري الرفض...' : 'تأكيد الرفض'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
