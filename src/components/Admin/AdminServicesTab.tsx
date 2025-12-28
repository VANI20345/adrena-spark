import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface AdminServicesTabProps {
  services: any[];
  onApprove: (id: string) => void;
  onDecline: (service: any) => void;
  onDelete: (id: string) => void;
  onViewDetails: (service: any) => void;
  loading: boolean;
}

export const AdminServicesTab: React.FC<AdminServicesTabProps> = ({
  services,
  onApprove,
  onDecline,
  onDelete,
  onViewDetails,
  loading
}) => {
  const { t, language } = useLanguageContext();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {language === 'ar' ? 'لا توجد خدمات معلقة' : 'No pending services'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.pendingServices')}</CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? `${services.length} خدمة بانتظار الموافقة`
            : `${services.length} services awaiting approval`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.fields.name')}</TableHead>
                <TableHead>{t('admin.fields.provider')}</TableHead>
                <TableHead>{t('admin.fields.category')}</TableHead>
                <TableHead>{t('admin.fields.price')}</TableHead>
                <TableHead>{t('admin.fields.status')}</TableHead>
                <TableHead className="text-right">{t('admin.fields.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">
                    {language === 'ar' ? service.name_ar : service.name}
                  </TableCell>
                  <TableCell>{service.provider_id?.slice(0, 8)}...</TableCell>
                  <TableCell>
                    {service.category_id?.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {service.price} {language === 'ar' ? 'ر.س' : 'SAR'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      {language === 'ar' ? 'معلق' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewDetails(service)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => onApprove(service.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => onDecline(service)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-red-100"
                        onClick={() => onDelete(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
