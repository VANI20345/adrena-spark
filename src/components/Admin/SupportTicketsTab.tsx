import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MessageSquare, CheckCircle, Clock } from 'lucide-react';

export const SupportTicketsTab = () => {
  const { t, language } = useLanguageContext();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const respondMutation = useMutation({
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
    onError: () => {
      toast.error(t('admin.tickets.responseError'));
    },
  });

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') {
      return <Badge variant="default">{t('admin.tickets.statusResolved')}</Badge>;
    } else if (status === 'in_progress') {
      return <Badge variant="secondary">{t('admin.tickets.statusInProgress')}</Badge>;
    }
    return <Badge variant="outline">{t('admin.tickets.statusPending')}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    return (
      <Badge variant="outline">
        {category === 'technical' ? t('admin.tickets.categoryTechnical') :
         category === 'billing' ? t('admin.tickets.categoryBilling') :
         category === 'general' ? t('admin.tickets.categoryGeneral') :
         category}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.tickets.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">{t('common.loading')}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.tickets.name')}</TableHead>
                <TableHead>{t('admin.tickets.email')}</TableHead>
                <TableHead>{t('admin.tickets.category')}</TableHead>
                <TableHead>{t('admin.tickets.subject')}</TableHead>
                <TableHead>{t('admin.tickets.status')}</TableHead>
                <TableHead>{t('admin.tickets.createdAt')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets?.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.name}</TableCell>
                  <TableCell>{ticket.email}</TableCell>
                  <TableCell>{getCategoryBadge(ticket.category)}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell>{format(new Date(ticket.created_at), 'PPp')}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={selectedTicket?.id === ticket.id} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedTicket(ticket)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {t('admin.tickets.viewDetails')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{t('admin.tickets.ticketDetails')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium">{t('admin.tickets.message')}:</p>
                            <p className="text-sm text-muted-foreground mt-1">{ticket.message}</p>
                          </div>
                          
                          {ticket.admin_notes && (
                            <div>
                              <p className="text-sm font-medium">{t('admin.tickets.adminResponse')}:</p>
                              <p className="text-sm text-muted-foreground mt-1">{ticket.admin_notes}</p>
                            </div>
                          )}
                          
                          {ticket.status === 'pending' && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t('admin.tickets.respondToTicket')}:</p>
                              <Textarea
                                value={adminResponse}
                                onChange={(e) => setAdminResponse(e.target.value)}
                                placeholder={t('admin.tickets.responsePlaceholder')}
                                rows={4}
                              />
                              <Button
                                onClick={() => respondMutation.mutate({ ticketId: ticket.id, notes: adminResponse })}
                                disabled={!adminResponse.trim() || respondMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('admin.tickets.markResolved')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};