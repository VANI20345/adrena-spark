import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Flag, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Users, 
  FileText, 
  MessageSquare, 
  Calendar, 
  Briefcase,
  User,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface EntityReport {
  id: string;
  entity_type: string;
  entity_id: string;
  reporter_id: string;
  reason: string;
  additional_details: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter?: { full_name: string; avatar_url: string | null };
  entity_name?: string;
}

export const EntityReportsTab = () => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<EntityReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch entity reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['entity-reports', filterStatus, filterType],
    queryFn: async () => {
      let query = supabase
        .from('entity_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterType !== 'all') {
        query = query.eq('entity_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch reporter profiles
      const reporterIds = [...new Set((data || []).map(r => r.reporter_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url')
        .in('user_id', reporterIds);

      const profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (profiles || []).forEach(p => {
        profilesMap[p.user_id] = { full_name: p.full_name || '', avatar_url: p.avatar_url };
      });

      // Fetch entity names based on type
      const reportsWithDetails = await Promise.all((data || []).map(async (report) => {
        let entityName = '';
        try {
          if (report.entity_type === 'group') {
            const { data: group } = await supabase
              .from('groups')
              .select('group_name')
              .eq('id', report.entity_id)
              .single();
            entityName = group?.group_name || '';
          } else if (report.entity_type === 'event') {
            const { data: event } = await supabase
              .from('events')
              .select('title, title_ar')
              .eq('id', report.entity_id)
              .single();
            entityName = isRTL ? event?.title_ar || event?.title || '' : event?.title || '';
          } else if (report.entity_type === 'service') {
            const { data: service } = await supabase
              .from('services')
              .select('name, name_ar')
              .eq('id', report.entity_id)
              .single();
            entityName = isRTL ? service?.name_ar || service?.name || '' : service?.name || '';
          } else if (report.entity_type === 'post') {
            const { data: post } = await supabase
              .from('posts')
              .select('content')
              .eq('id', report.entity_id)
              .single();
            entityName = post?.content?.substring(0, 50) + '...' || '';
          } else if (report.entity_type === 'comment') {
            const { data: comment } = await supabase
              .from('comments')
              .select('content')
              .eq('id', report.entity_id)
              .single();
            entityName = comment?.content?.substring(0, 50) + '...' || '';
          } else if (report.entity_type === 'user') {
            const { data: profile } = await supabase
              .from('profiles_public')
              .select('full_name')
              .eq('user_id', report.entity_id)
              .single();
            entityName = profile?.full_name || '';
          }
        } catch (e) {
          entityName = isRTL ? 'غير متوفر' : 'Not available';
        }

        return {
          ...report,
          reporter: profilesMap[report.reporter_id],
          entity_name: entityName,
        };
      }));

      return reportsWithDetails as EntityReport[];
    },
  });

  // Update report status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('entity_reports')
        .update({
          status,
          admin_notes: notes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-reports'] });
      toast.success(isRTL ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully');
      setSelectedReport(null);
      setAdminNotes('');
    },
    onError: () => {
      toast.error(isRTL ? 'فشل تحديث الحالة' : 'Failed to update status');
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      reviewed: { variant: 'secondary', icon: <Eye className="w-3 h-3" /> },
      resolved: { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
      dismissed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
    };
    const { variant, icon } = variants[status] || variants.pending;
    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'معلق' },
      reviewed: { en: 'Reviewed', ar: 'تمت المراجعة' },
      resolved: { en: 'Resolved', ar: 'تم الحل' },
      dismissed: { en: 'Dismissed', ar: 'مرفوض' },
    };
    return (
      <Badge variant={variant} className="gap-1">
        {icon}
        {isRTL ? labels[status]?.ar : labels[status]?.en}
      </Badge>
    );
  };

  const getEntityTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      group: <Users className="w-4 h-4" />,
      post: <FileText className="w-4 h-4" />,
      comment: <MessageSquare className="w-4 h-4" />,
      event: <Calendar className="w-4 h-4" />,
      service: <Briefcase className="w-4 h-4" />,
      user: <User className="w-4 h-4" />,
    };
    return icons[type] || <Flag className="w-4 h-4" />;
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      group: { en: 'Group', ar: 'مجموعة' },
      post: { en: 'Post', ar: 'منشور' },
      comment: { en: 'Comment', ar: 'تعليق' },
      event: { en: 'Event', ar: 'فعالية' },
      service: { en: 'Service', ar: 'خدمة' },
      user: { en: 'User', ar: 'مستخدم' },
    };
    return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      spam: { en: 'Spam', ar: 'بريد مزعج' },
      harassment: { en: 'Harassment', ar: 'تحرش' },
      inappropriate: { en: 'Inappropriate', ar: 'غير لائق' },
      false_info: { en: 'False Info', ar: 'معلومات خاطئة' },
      hate_speech: { en: 'Hate Speech', ar: 'خطاب كراهية' },
      fraud: { en: 'Fraud', ar: 'احتيال' },
      misleading: { en: 'Misleading', ar: 'مضلل' },
      safety_concern: { en: 'Safety', ar: 'مخاوف أمنية' },
      poor_quality: { en: 'Poor Quality', ar: 'جودة رديئة' },
      impersonation: { en: 'Impersonation', ar: 'انتحال' },
      other: { en: 'Other', ar: 'أخرى' },
    };
    return isRTL ? labels[reason]?.ar || reason : labels[reason]?.en || reason;
  };

  const openReportDetails = (report: EntityReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
        <div className={`flex items-center justify-between flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            {isRTL ? 'بلاغات المحتوى' : 'Content Reports'}
          </CardTitle>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                <SelectItem value="group">{isRTL ? 'مجموعات' : 'Groups'}</SelectItem>
                <SelectItem value="post">{isRTL ? 'منشورات' : 'Posts'}</SelectItem>
                <SelectItem value="comment">{isRTL ? 'تعليقات' : 'Comments'}</SelectItem>
                <SelectItem value="event">{isRTL ? 'فعاليات' : 'Events'}</SelectItem>
                <SelectItem value="service">{isRTL ? 'خدمات' : 'Services'}</SelectItem>
                <SelectItem value="user">{isRTL ? 'مستخدمين' : 'Users'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</SelectItem>
                <SelectItem value="pending">{isRTL ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="reviewed">{isRTL ? 'تمت المراجعة' : 'Reviewed'}</SelectItem>
                <SelectItem value="resolved">{isRTL ? 'تم الحل' : 'Resolved'}</SelectItem>
                <SelectItem value="dismissed">{isRTL ? 'مرفوض' : 'Dismissed'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا توجد بلاغات' : 'No reports found'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المحتوى' : 'Content'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المُبلِّغ' : 'Reporter'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'السبب' : 'Reason'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getEntityTypeIcon(report.entity_type)}
                        {getEntityTypeLabel(report.entity_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {report.entity_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={report.reporter?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {report.reporter?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{report.reporter?.full_name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getReasonLabel(report.reason)}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(report.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReportDetails(report)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        {isRTL ? 'عرض' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Report Details Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                {isRTL ? 'تفاصيل البلاغ' : 'Report Details'}
              </DialogTitle>
              <DialogDescription>
                {selectedReport && (
                  <span>
                    {getEntityTypeLabel(selectedReport.entity_type)} - {selectedReport.entity_name}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <ScrollArea className="flex-1">
                <div className="space-y-6 p-1">
                  {/* Report Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {isRTL ? 'نوع المحتوى' : 'Content Type'}
                      </p>
                      <Badge variant="outline" className="gap-1">
                        {getEntityTypeIcon(selectedReport.entity_type)}
                        {getEntityTypeLabel(selectedReport.entity_type)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {isRTL ? 'الحالة' : 'Status'}
                      </p>
                      {getStatusBadge(selectedReport.status)}
                    </div>
                  </div>

                  <Separator />

                  {/* Reporter Info */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {isRTL ? 'المُبلِّغ' : 'Reporter'}
                    </p>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar>
                        <AvatarImage src={selectedReport.reporter?.avatar_url || ''} />
                        <AvatarFallback>
                          {selectedReport.reporter?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedReport.reporter?.full_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedReport.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {isRTL ? 'سبب الإبلاغ' : 'Report Reason'}
                    </p>
                    <Badge variant="destructive">{getReasonLabel(selectedReport.reason)}</Badge>
                  </div>

                  {/* Additional Details */}
                  {selectedReport.additional_details && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {isRTL ? 'تفاصيل إضافية' : 'Additional Details'}
                      </p>
                      <p className="text-sm p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                        {selectedReport.additional_details}
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Admin Response */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {isRTL ? 'ملاحظات الإدارة' : 'Admin Notes'}
                    </p>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={isRTL ? 'اكتب ملاحظاتك هنا...' : 'Write your notes here...'}
                      rows={3}
                    />
                  </div>

                  {/* Actions */}
                  {selectedReport.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        onClick={() => updateStatusMutation.mutate({ 
                          reportId: selectedReport.id, 
                          status: 'resolved',
                          notes: adminNotes 
                        })}
                        disabled={updateStatusMutation.isPending}
                        className="gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {isRTL ? 'حل البلاغ' : 'Resolve'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ 
                          reportId: selectedReport.id, 
                          status: 'reviewed',
                          notes: adminNotes 
                        })}
                        disabled={updateStatusMutation.isPending}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        {isRTL ? 'تمت المراجعة' : 'Mark Reviewed'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ 
                          reportId: selectedReport.id, 
                          status: 'dismissed',
                          notes: adminNotes 
                        })}
                        disabled={updateStatusMutation.isPending}
                        className="gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        {isRTL ? 'رفض' : 'Dismiss'}
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
