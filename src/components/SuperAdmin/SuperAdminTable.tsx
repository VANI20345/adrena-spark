import React from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Column {
  key: string;
  header: string;
  isAction?: boolean;
  render?: (row: any) => React.ReactNode;
}

interface SuperAdminTableProps {
  columns: Column[];
  data: any[];
  emptyState?: React.ReactNode;
  getRowKey?: (row: any) => string;
}

/**
 * SuperAdminTable - RTL-aware table wrapper for Super Admin pages
 * 
 * Features:
 * - Automatic text-right for Arabic headers/cells
 * - Proper action button positioning in RTL mode
 * - Consistent column alignment
 */
export const SuperAdminTable: React.FC<SuperAdminTableProps> = ({
  columns,
  data,
  emptyState,
  getRowKey = (row) => row.id,
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div className="rounded-md border" dir={isRTL ? 'rtl' : 'ltr'}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={
                  column.isAction
                    ? isRTL ? 'text-left' : 'text-right'
                    : isRTL ? 'text-right' : 'text-left'
                }
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={getRowKey(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={
                      column.isAction
                        ? isRTL ? 'text-left' : 'text-right'
                        : isRTL ? 'text-right' : 'text-left'
                    }
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

// Table cell with flex content (for avatar + text layouts)
interface SuperAdminTableCellContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SuperAdminTableCellContent: React.FC<SuperAdminTableCellContentProps> = ({
  children,
  className = '',
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''} ${className}`}>
      {children}
    </div>
  );
};

// Table action buttons wrapper
interface SuperAdminTableActionsProps {
  children: React.ReactNode;
}

export const SuperAdminTableActions: React.FC<SuperAdminTableActionsProps> = ({
  children,
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div className={`flex gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
      {children}
    </div>
  );
};

// Text alignment wrapper for table cells
interface SuperAdminTextAlignProps {
  children: React.ReactNode;
  className?: string;
}

export const SuperAdminTextAlign: React.FC<SuperAdminTextAlignProps> = ({
  children,
  className = '',
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div className={`${isRTL ? 'text-right' : 'text-left'} ${className}`}>
      {children}
    </div>
  );
};

export default SuperAdminTable;
