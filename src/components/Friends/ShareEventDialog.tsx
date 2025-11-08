import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFriends } from '@/hooks/useFriends';

interface ShareEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export const ShareEventDialog = ({ open, onOpenChange, eventId, eventTitle }: ShareEventDialogProps) => {
  const { friends } = useFriends();
  const { toast } = useToast();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء اختيار صديق واحد على الأقل',
        variant: 'destructive'
      });
      return;
    }

    setSharing(true);
    try {
      const { error } = await supabase.functions.invoke('share-event', {
        body: {
          event_id: eventId,
          friend_ids: selectedFriends,
          message: message.trim() || null
        }
      });

      if (error) throw error;

      toast({
        title: 'تم المشاركة',
        description: `تم مشاركة الفعالية مع ${selectedFriends.length} من الأصدقاء`
      });

      onOpenChange(false);
      setSelectedFriends([]);
      setMessage('');
    } catch (error) {
      console.error('Error sharing event:', error);
      toast({
        title: 'خطأ',
        description: 'فشل مشاركة الفعالية',
        variant: 'destructive'
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            مشاركة الفعالية
          </DialogTitle>
          <DialogDescription>
            شارك "{eventTitle}" مع أصدقائك
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="إضافة رسالة (اختياري)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <div>
            <p className="text-sm font-medium mb-2">اختر الأصدقاء:</p>
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا يوجد أصدقاء لمشاركة الفعالية معهم
                </p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.friend_id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                      onClick={() => toggleFriend(friend.friend_id)}
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friend.friend_id)}
                        onCheckedChange={() => toggleFriend(friend.friend_id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{friend.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{friend.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button onClick={handleShare} disabled={sharing || selectedFriends.length === 0}>
              {sharing ? 'جاري المشاركة...' : 'مشاركة'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};