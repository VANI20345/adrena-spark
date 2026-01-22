import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { CreateGroupWizard } from './CreateGroupWizard';

interface CreateGroupDialogProps {
  onGroupCreated?: () => void;
}

export const CreateGroupDialog = ({ onGroupCreated }: CreateGroupDialogProps) => {
  const { language } = useLanguageContext();
  const [open, setOpen] = useState(false);
  const isRTL = language === 'ar';

  const handleSuccess = () => {
    setOpen(false);
    onGroupCreated?.();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        {isRTL ? 'إنشاء مجموعة' : 'Create Group'}
      </Button>
      
      <CreateGroupWizard 
        open={open} 
        onClose={() => setOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};