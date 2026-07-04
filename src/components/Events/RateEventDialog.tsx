import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  bookingId?: string;
  eventTitle?: string;
  onSubmitted?: () => void;
}

const RateEventDialog = ({ open, onOpenChange, eventId, bookingId, eventTitle, onSubmitted }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || !eventId || !bookingId || rating < 1) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        event_id: eventId,
        booking_id: bookingId,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast({
        title: isRTL ? 'شكراً لتقييمك' : 'Thanks for your review',
      });
      setRating(0);
      setComment('');
      onSubmitted?.();
    } catch (e: any) {
      console.error('Review insert failed', e);
      toast({
        title: isRTL ? 'تعذّر إرسال التقييم' : 'Failed to submit review',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'قيّم الفعالية' : 'Rate this event'}
          </DialogTitle>
          {eventTitle && (
            <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{eventTitle}</p>
          )}
        </DialogHeader>

        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  (hover || rating) >= n ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          placeholder={isRTL ? 'اكتب تعليقك (اختياري)' : 'Add a comment (optional)'}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          className={isRTL ? 'text-right' : 'text-left'}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={submit} disabled={submitting || rating < 1}>
            {submitting ? (isRTL ? 'جارٍ الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال' : 'Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateEventDialog;
