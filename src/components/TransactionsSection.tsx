import { useEffect, useRef, useState } from 'react';
import type { EditableField, EditableTransaction } from '../hooks/useEditableTransactions';
import type { ColumnRole } from '../lib/pdf/types';
import type { ColumnShape } from '../lib/transactions/types';
import type { ReconciliationResult } from '../lib/validation/types';
import type { ExportFormat } from '../hooks/useExport';
import type { ExportOptions } from '../lib/export/types';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { collectFlaggedFields } from '../lib/editableTransactionFlags';
import { TransactionGrid } from './TransactionGrid';
import { TransactionCardList } from './TransactionCardList';
import { ReviewMode } from './ReviewMode';
import { MobileStickyBar } from './MobileStickyBar';

interface TransactionsSectionProps {
  fileName: string | null;
  rows: EditableTransaction[];
  onCommitEdit: (id: string, field: EditableField, rawValue: string) => boolean;
  onDeleteRow: (id: string) => void;
  onInsertRow: (afterId: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  rowFlags?: Map<string, string[]>;
  columnRoles: ColumnRole[];
  columnPreviews: string[];
  columnShape: ColumnShape | null;
  onColumnRoleReassign: (field: ColumnRole, newIndex: number) => void;
  reconciliation: ReconciliationResult;
  onExport: (format: ExportFormat) => void;
  // Output settings — passed straight through to TransactionGrid (desktop,
  // and mobile's "view as table") so the table renders exactly what these
  // say. The card list and Review Mode don't take this — they're a
  // deliberately different, column-agnostic interaction model.
  options: ExportOptions;
}

type MobileView = 'review' | 'cards' | 'table';

// Owns the responsive branch: desktop renders TransactionGrid exactly as it
// always has (untouched by anything below). Narrow screens get a genuinely
// different interaction model instead of a shrunk table — conditionally
// *mounted*, not just hidden, so the desktop grid's virtualized scroll
// state and the mobile views never both exist at once.
export function TransactionsSection({
  fileName,
  rows,
  onCommitEdit,
  onDeleteRow,
  onInsertRow,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  rowFlags,
  columnRoles,
  columnPreviews,
  columnShape,
  onColumnRoleReassign,
  reconciliation,
  onExport,
  options,
}: TransactionsSectionProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [view, setView] = useState<MobileView>('cards');

  // A genuinely new file defaults into Review Mode when there's anything
  // to review, otherwise straight to the card list — never carries over a
  // stale view from whatever statement was open before. `rows` seeds in
  // asynchronously after `fileName` is already set (the extraction
  // pipeline runs in between), so this can't just key off `fileName` alone
  // — it has to wait until rows for *this* file actually show up before
  // deciding, then do that decision exactly once per file.
  const initializedForFileRef = useRef<string | null>(null);
  useEffect(() => {
    if (rows.length === 0) return;
    if (initializedForFileRef.current === fileName) return;
    initializedForFileRef.current = fileName;
    setView(collectFlaggedFields(rows).length > 0 ? 'review' : 'cards');
  }, [fileName, rows]);

  if (!isMobile) {
    return (
      <TransactionGrid
        rows={rows}
        onCommitEdit={onCommitEdit}
        onDeleteRow={onDeleteRow}
        onInsertRow={onInsertRow}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        rowFlags={rowFlags}
        columnRoles={columnRoles}
        columnPreviews={columnPreviews}
        columnShape={columnShape}
        onColumnRoleReassign={onColumnRoleReassign}
        options={options}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-24">
      {view !== 'table' && (
        <button
          type="button"
          onClick={() => setView('table')}
          className="min-h-11 self-end text-sm font-medium text-accent"
        >
          View as table
        </button>
      )}

      {view === 'review' && (
        <ReviewMode rows={rows} onCommitEdit={onCommitEdit} onExit={() => setView('cards')} />
      )}

      {view === 'cards' && (
        <TransactionCardList
          rows={rows}
          onCommitEdit={onCommitEdit}
          onDeleteRow={onDeleteRow}
          onInsertRow={onInsertRow}
          rowFlags={rowFlags}
        />
      )}

      {view === 'table' && (
        <>
          <button
            type="button"
            onClick={() => setView('cards')}
            className="min-h-11 self-start text-sm font-medium text-accent"
          >
            ‹ Back to cards
          </button>
          <TransactionGrid
            rows={rows}
            onCommitEdit={onCommitEdit}
            onDeleteRow={onDeleteRow}
            onInsertRow={onInsertRow}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            rowFlags={rowFlags}
            columnRoles={columnRoles}
            columnPreviews={columnPreviews}
            columnShape={columnShape}
            onColumnRoleReassign={onColumnRoleReassign}
            options={options}
            freezeDateColumn
          />
        </>
      )}

      <MobileStickyBar result={reconciliation} rowCount={rows.length} onExport={onExport} />
    </div>
  );
}
