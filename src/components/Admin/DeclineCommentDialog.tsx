import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DeclineCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (comment: string) => void;
  itemName: string;
  loading?: boolean;
}

export const DeclineCommentDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  itemName,
  loading 
}: DeclineCommentDialogProps) => {
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    onConfirm(comment);
    setComment('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>رفض {itemName}</DialogTitle>
          <DialogDescription>
            يرجى إضافة سبب الرفض ليتمكن المستخدم من معرفة السبب وإصلاحه
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="comment">سبب الرفض</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="مثال: الصور المرفقة غير واضحة، يرجى رفع صور بجودة أفضل"
              rows={4}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!comment.trim() || loading}
          >
            {loading ? 'جاري الرفض...' : 'رفض'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
