import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { ReportEntityDialog, ReportEntityType } from './ReportEntityDialog';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ReportButtonProps {
  entityType: ReportEntityType;
  entityId: string;
  entityName?: string;
  variant?: 'icon' | 'text' | 'menu';
  className?: string;
}

export const ReportButton = ({
  entityType,
  entityId,
  entityName,
  variant = 'icon',
  className
}: ReportButtonProps) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [open, setOpen] = useState(false);

  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm",
            className
          )}
        >
          <Flag className="w-4 h-4" />
          {isRTL ? 'إبلاغ' : 'Report'}
        </button>
        <ReportEntityDialog
          open={open}
          onClose={() => setOpen(false)}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
        />
      </>
    );
  }

  if (variant === 'text') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn("text-destructive hover:text-destructive hover:bg-destructive/10", className)}
        >
          <Flag className="w-4 h-4 mr-1" />
          {isRTL ? 'إبلاغ' : 'Report'}
        </Button>
        <ReportEntityDialog
          open={open}
          onClose={() => setOpen(false)}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn("text-muted-foreground hover:text-destructive hover:bg-destructive/10", className)}
        title={isRTL ? 'إبلاغ' : 'Report'}
      >
        <Flag className="w-4 h-4" />
      </Button>
      <ReportEntityDialog
        open={open}
        onClose={() => setOpen(false)}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
      />
    </>
  );
};
