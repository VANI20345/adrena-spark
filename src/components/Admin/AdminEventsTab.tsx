import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { EventServiceDetailsDialog } from './EventServiceDetailsDialog';
import { DeclineCommentDialog } from './DeclineCommentDialog';
import { Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface AdminEventsTabProps {
  events: any[];
  onApprove: (id: string) => void;
  onDecline: (event: any) => void;
  onDelete: (id: string) => void;
  onViewDetails: (event: any) => void;
  loading: boolean;
}

export const AdminEventsTab: React.FC<AdminEventsTabProps> = ({
  events,
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

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {language === 'ar' ? 'لا توجد فعاليات معلقة' : 'No pending events'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.pendingEvents')}</CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? `${events.length} فعالية بانتظار الموافقة`
            : `${events.length} events awaiting approval`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.fields.title')}</TableHead>
                <TableHead>{t('admin.fields.organizer')}</TableHead>
                <TableHead>{t('admin.fields.date')}</TableHead>
                <TableHead>{t('admin.fields.price')}</TableHead>
                <TableHead>{t('admin.fields.status')}</TableHead>
                <TableHead className="text-right">{t('admin.fields.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    {language === 'ar' ? event.title_ar : event.title}
                  </TableCell>
                  <TableCell>{event.organizer_id?.slice(0, 8)}...</TableCell>
                  <TableCell>
                    {format(new Date(event.start_date), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell>
                    {event.price} {language === 'ar' ? 'ر.س' : 'SAR'}
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
                        onClick={() => onViewDetails(event)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => onApprove(event.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => onDecline(event)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-red-100"
                        onClick={() => onDelete(event.id)}
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
