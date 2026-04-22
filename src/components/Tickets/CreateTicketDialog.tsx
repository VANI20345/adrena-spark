import React, { useState } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, HelpCircle, GraduationCap, Users, Send, Loader2, Sparkles, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CreateTicketDialogProps {
  open: boolean;
  onClose: () => void;
  ticketType: 'group_inquiry' | 'training_inquiry' | 'support' | 'event_inquiry' | 'general';
  entityType?: 'group' | 'service' | 'event' | null;
  entityId?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserAvatar?: string;
  entityName?: string;
}

const ticketConfig = {
  group_inquiry: { 
    icon: Users,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    title: { en: 'Ask the Leader', ar: 'اسأل قائد المجموعة' },
    subtitle: { en: 'Start a conversation with the group leader', ar: 'ابدأ محادثة مع قائد المجموعة' },
    placeholder: { en: 'Ask about group activities, requirements, or anything else...', ar: 'اسأل عن أنشطة المجموعة، المتطلبات، أو أي شيء آخر...' }
  },
  training_inquiry: { 
    icon: GraduationCap,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-500/10 to-pink-500/10',
    title: { en: 'Consult Trainer', ar: 'استشر المدرب' },
    subtitle: { en: 'Get expert advice from the trainer', ar: 'احصل على نصيحة خبير من المدرب' },
    placeholder: { en: 'Ask about the training, schedule, or preparation tips...', ar: 'اسأل عن التدريب، الجدول، أو نصائح التحضير...' }
  },
  event_inquiry: { 
    icon: Calendar,
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-500/10 to-amber-500/10',
    title: { en: 'Ask the Organizer', ar: 'اسأل المنظم' },
    subtitle: { en: 'Start a conversation with the event organizer', ar: 'ابدأ محادثة مع منظم الفعالية' },
    placeholder: { en: 'Ask about the event details, requirements, or anything else...', ar: 'اسأل عن تفاصيل الفعالية، المتطلبات، أو أي شيء آخر...' }
  },
  support: { 
    icon: HelpCircle,
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    title: { en: 'Platform Support', ar: 'دعم المنصة' },
    subtitle: { en: 'Get help from our support team', ar: 'احصل على مساعدة من فريق الدعم' },
    placeholder: { en: 'Describe your issue or question...', ar: 'صف مشكلتك أو سؤالك...' }
  },
  general: { 
    icon: MessageSquare,
    gradient: 'from-indigo-500 to-violet-500',
    bgGradient: 'from-indigo-500/10 to-violet-500/10',
    title: { en: 'New Inquiry', ar: 'استفسار جديد' },
    subtitle: { en: 'Send a new message or inquiry', ar: 'أرسل رسالة أو استفسار جديد' },
    placeholder: { en: 'Write your message or inquiry...', ar: 'اكتب رسالتك أو استفسارك...' }
  }
};

export const CreateTicketDialog: React.FC<CreateTicketDialogProps> = ({
  open,
  onClose,
  ticketType,
  entityType,
  entityId,
  targetUserId,
  targetUserName,
  targetUserAvatar,
  entityName
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  const config = ticketConfig[ticketType];
  const Icon = config.icon;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !message.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Check for existing open ticket
      const { data: existingTicket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('status', 'open')
        .maybeSingle();
      
      if (existingTicket) {
        toast({
          title: isRTL ? 'تذكرة موجودة' : 'Ticket Exists',
          description: isRTL 
            ? 'لديك تذكرة مفتوحة بالفعل لهذا الموضوع'
            : 'You already have an open ticket for this entity',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          ticket_type: ticketType,
          entity_type: entityType,
          entity_id: entityId,
          target_user_id: targetUserId,
          subject: subject.trim(),
          status: 'open'
        })
        .select()
        .single();
      
      if (ticketError) throw ticketError;
      
      // Add first message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: message.trim()
        });
      
      if (messageError) throw messageError;

      // Create notification for target user
      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          type: 'new_ticket',
          title: isRTL ? 'رسالة جديدة' : 'New Message',
          message: isRTL 
            ? `لديك استفسار جديد: ${subject.trim()}`
            : `You have a new inquiry: ${subject.trim()}`,
          data: { ticket_id: ticket.id, sender_id: user.id }
        });
      }
      
      setIsSent(true);
      
      setTimeout(() => {
        toast({
          title: isRTL ? 'تم إرسال الرسالة' : 'Message Sent',
          description: isRTL 
            ? 'سيتم الرد عليك في أقرب وقت'
            : 'You will receive a response soon'
        });
        
        setSubject('');
        setMessage('');
        setIsSent(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL 
          ? 'فشل إرسال الرسالة'
          : 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side={isRTL ? 'left' : 'right'} 
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        {/* Chat-like Header */}
        <div className={cn(
          "p-6 bg-gradient-to-br",
          config.bgGradient
        )}>
          <SheetHeader className="text-left">
            <div className="flex items-center gap-4">
              <motion.div 
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                  "bg-gradient-to-br", config.gradient
                )}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' }}
              >
                <Icon className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <SheetTitle className="text-xl">
                  {config.title[isRTL ? 'ar' : 'en']}
                </SheetTitle>
                <SheetDescription className="text-sm">
                  {config.subtitle[isRTL ? 'ar' : 'en']}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          {/* Target user info */}
          {(targetUserName || entityName) && (
            <motion.div 
              className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {targetUserAvatar && (
                <Avatar className="h-10 w-10 border-2 border-white/50">
                  <AvatarImage src={targetUserAvatar} />
                  <AvatarFallback>{targetUserName?.[0] || '?'}</AvatarFallback>
                </Avatar>
              )}
              <div>
                {targetUserName && (
                  <p className="font-medium text-sm">{targetUserName}</p>
                )}
                {entityName && (
                  <p className="text-xs text-muted-foreground">{entityName}</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {isSent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <Sparkles className="w-10 h-10 text-green-600" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">
                  {isRTL ? 'تم الإرسال!' : 'Message Sent!'}
                </h3>
                <p className="text-muted-foreground">
                  {isRTL ? 'سيتم الرد عليك قريباً' : 'You will receive a response soon'}
                </p>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                onSubmit={handleSubmit} 
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-medium">
                    {isRTL ? 'الموضوع' : 'Subject'}
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={isRTL ? 'موضوع استفسارك...' : 'Subject of your inquiry...'}
                    className="h-12"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">
                    {isRTL ? 'رسالتك' : 'Your Message'}
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={config.placeholder[isRTL ? 'ar' : 'en']}
                    rows={6}
                    className="resize-none"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    className="flex-1"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !subject.trim() || !message.trim()}
                    className={cn(
                      "flex-1 gap-2",
                      "bg-gradient-to-r", config.gradient,
                      "hover:opacity-90"
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    )}
                    {isRTL ? 'إرسال' : 'Send'}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
};