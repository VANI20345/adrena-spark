import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MessageSquare, CheckCircle, AlertCircle, Ban } from 'lucide-react';

export const UnifiedTicketsTab = () => {
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch support tickets
  const { data: supportTickets = [], isLoading: loadingSupport } = useQuery({
    queryKey: ['support-tickets', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch reported messages
  const { data: reportedMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['reported-messages', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('reported_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user reports
  const { data: userReports = [], isLoading: loadingUserReports } = useQuery({
    queryKey: ['user-reports', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Respond to support ticket
  const respondToTicketMutation = useMutation({
    mutationFn: async ({ ticketId, notes }: { ticketId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('contact_submissions')
        .update({
          status: 'resolved',
          admin_notes: notes,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', ticketId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success(t('admin.tickets.responseSuccess'));
      setSelectedTicket(null);
      setAdminResponse('');
    },
  });

  // Update reported message status
  const updateMessageStatusMutation = useMutation({
    mutationFn: async ({ messageId, status, notes }: { messageId: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('reported_messages')
        .update({
          status,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reported-messages'] });
      toast.success('تم تحديث الحالة بنجاح');
      setSelectedTicket(null);
      setAdminResponse('');
    },
  });

  // Update user report status
  const updateUserReportMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_reports')
        .update({
          status,
          admin_notes: notes,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reports'] });
      toast.success('تم تحديث الحالة بنجاح');
      setSelectedTicket(null);
      setAdminResponse('');
    },
  });

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') {
      return <Badge variant="default">{t('admin.tickets.statusResolved')}</Badge>;
    } else if (status === 'in_progress') {
      return <Badge variant="secondary">{t('admin.tickets.reviewing')}</Badge>;
    }
    return <Badge variant="outline">{t('admin.tickets.statusPending')}</Badge>;
  };

  return (
    <Card>
      <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CardTitle>{t('admin.tickets.title')}</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('admin.tickets.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.tickets.allTickets')}</SelectItem>
              <SelectItem value="pending">{t('admin.tickets.statusPending')}</SelectItem>
              <SelectItem value="in_progress">{t('admin.tickets.statusInProgress')}</SelectItem>
              <SelectItem value="resolved">{t('admin.tickets.statusResolved')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="support" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TabsTrigger value="support">{t('admin.tickets.supportTickets')}</TabsTrigger>
            <TabsTrigger value="messages">{t('admin.tickets.reportedMessages')}</TabsTrigger>
            <TabsTrigger value="users">{t('admin.tickets.userReports')}</TabsTrigger>
          </TabsList>

          {/* Support Tickets Tab */}
          <TabsContent value="support">
            {loadingSupport ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.name')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.email')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.subject')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.status')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.createdAt')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{ticket.name}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{ticket.email}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{ticket.subject}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {format(new Date(ticket.created_at), 'PPp')}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicket({ ...ticket, type: 'support' })}
                          className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          {t('admin.tickets.viewDetails')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Reported Messages Tab */}
          <TabsContent value="messages">
            {loadingMessages ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.reporter')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.sender')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.reason')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.status')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.reportedAt')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportedMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{message.reported_by}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{message.sender_id}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{message.reason}</TableCell>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {format(new Date(message.created_at || Date.now()), 'PPp')}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicket({ ...message, type: 'message' })}
                          className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          {t('admin.tickets.viewDetails')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* User Reports Tab */}
          <TabsContent value="users">
            {loadingUserReports ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.reporter')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.reportedUser')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.reason')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.status')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.reportedAt')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{report.reporter_id}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{report.reported_user_id}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{report.reason}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {format(new Date(report.created_at), 'PPp')}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicket({ ...report, type: 'user_report' })}
                          className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          {t('admin.tickets.viewDetails')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        {/* Unified Details Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('admin.tickets.ticketDetails')}</DialogTitle>
            </DialogHeader>
            <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {selectedTicket?.type === 'support' && (
                <>
                  <div>
                    <p className="text-sm font-medium">{t('admin.tickets.message')}:</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.message}</p>
                  </div>
                  {selectedTicket.admin_notes && (
                    <div>
                      <p className="text-sm font-medium">{t('admin.tickets.adminResponse')}:</p>
                      <p className="text-sm text-muted-foreground mt-1">{selectedTicket.admin_notes}</p>
                    </div>
                  )}
                  {selectedTicket.status === 'pending' && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('admin.tickets.respondToTicket')}:</p>
                      <Textarea
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder={t('admin.tickets.responsePlaceholder')}
                        rows={4}
                      />
                      <Button
                        onClick={() => respondToTicketMutation.mutate({ ticketId: selectedTicket.id, notes: adminResponse })}
                        disabled={!adminResponse.trim() || respondToTicketMutation.isPending}
                        className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('admin.tickets.markResolved')}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {selectedTicket?.type === 'message' && (
                <>
                  <div>
                    <p className="text-sm font-medium">{t('admin.tickets.messageContent')}:</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.message_content}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('admin.tickets.reason')}:</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.reason}</p>
                  </div>
                  {selectedTicket.status === 'pending' && (
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        onClick={() => updateMessageStatusMutation.mutate({ messageId: selectedTicket.id, status: 'resolved' })}
                        className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('admin.tickets.resolve')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => updateMessageStatusMutation.mutate({ messageId: selectedTicket.id, status: 'dismissed' })}
                        className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Ban className="w-4 h-4" />
                        {t('admin.tickets.dismiss')}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {selectedTicket?.type === 'user_report' && (
                <>
                  <div>
                    <p className="text-sm font-medium">{t('admin.tickets.reason')}:</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('admin.tickets.description')}:</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.description || '—'}</p>
                  </div>
                  {selectedTicket.status === 'pending' && (
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        onClick={() => updateUserReportMutation.mutate({ reportId: selectedTicket.id, status: 'resolved' })}
                        className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('admin.tickets.resolve')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => updateUserReportMutation.mutate({ reportId: selectedTicket.id, status: 'dismissed' })}
                        className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Ban className="w-4 h-4" />
                        {t('admin.tickets.dismiss')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
