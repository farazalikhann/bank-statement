import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePdfExtraction } from '../hooks/usePdfExtraction';
import { useEditableTransactions } from '../hooks/useEditableTransactions';
import { useReconciliation } from '../hooks/useReconciliation';
import { useExport } from '../hooks/useExport';
import { FileDropzone } from './FileDropzone';
import { ErrorMessage } from './ErrorMessage';
import { PageSelector } from './PageSelector';
import { ControlsPanel } from './ControlsPanel';
import { StatsBar } from './StatsBar';
import { ExtractedTable } from './ExtractedTable';
import { DroppedRowsPanel } from './DroppedRowsPanel';
import { ParsingSummary } from './ParsingSummary';
import { IntegrityReport } from './IntegrityReport';
import { TransactionsSection } from './TransactionsSection';
import { ReconciliationPanel } from './ReconciliationPanel';
import { OutputPanel } from './OutputPanel';
import { ColumnDetectionWarning } from './ColumnDetectionWarning';
import { LandingContent } from './marketing/LandingContent';
import type { ColumnRole } from '../lib/pdf/types';
import { isFieldFlagged } from '../lib/editableTransactionFlags';
import { selectRows } from '../lib/export/rowSelection';

function formatMoney(value: number): string {
  return Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const UNSAVED_EDITS_MESSAGE =
  'You have unsaved edits in the transaction table. They exist only in this tab and will be lost. Continue anyway?';

interface ConversionToolProps {
  // The homepage shows the generic Hero/HowItWorks/Faq marketing block
  // below the dropzone (see LandingContent's own doc comment — that's what
  // keeps a bare tool page from reading as a single-purpose utility to
  // AdSense review). A bank-specific page already supplies its own
  // long-form, bank-specific content around the embedded tool, so
  // repeating the generic homepage copy there would just be duplicate
  // content across every one of those pages.
  showLandingContent?: boolean;
  // Bank pages want a shorter, page-relevant prompt above the dropzone
  // instead of the generic homepage one.
  prompt?: string;
}

// The interactive tool itself — dropzone through to export — with no page
// chrome (no h1, no header/footer). Reused on both the homepage and every
// /convert/<bank> page so "embedded working tool" means the literal same
// component, not a copy.
export function ConversionTool({
  showLandingContent = true,
  prompt = 'Drop a statement. Get verified Excel. Nothing uploads.',
}: ConversionToolProps) {
  // Read lazily (not at module scope) so this component can render during
  // static pre-rendering in Node, where `window` doesn't exist yet.
  const [isDebug] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('debug') === '1',
  );

  const {
    fileName,
    numPages,
    currentPageNumber,
    setCurrentPageNumber,
    isLoadingFile,
    extractionProgress,
    error,
    toleranceY,
    setToleranceY,
    gapX,
    setGapX,
    rawStats,
    cleanedRows,
    droppedRows,
    columnRoles,
    setColumnRoleOverride,
    dateFormatInfo,
    fallbackYear,
    setDateFormatOverride,
    columnShape,
    transactionOrder,
    transactions,
    currentPageTransactions,
    currentPageConfidence,
    pageIntegrity,
    statementSummary,
    columnDetectionWarning,
    loadFile,
    reset,
  } = usePdfExtraction();

  const {
    rows: editableRows,
    hasEdits,
    canUndo,
    canRedo,
    commitEdit,
    deleteRow,
    insertRow,
    undo,
    redo,
  } = useEditableTransactions(fileName, transactions, dateFormatInfo, fallbackYear);

  const {
    result: reconciliation,
    setOpeningBalanceInput,
    setClosingBalanceInput,
  } = useReconciliation(fileName, editableRows, statementSummary);

  const rowFlags = useMemo(() => {
    const map = new Map<string, string[]>();
    const addFlag = (rowId: string, message: string) => {
      const list = map.get(rowId) ?? [];
      list.push(message);
      map.set(rowId, list);
    };

    for (const brk of reconciliation.balanceBreaks) {
      addFlag(
        brk.rowId,
        `Balance doesn't match — expected ${formatMoney(brk.expectedBalance)}, found ${formatMoney(brk.actualBalance)} (off by $${formatMoney(brk.difference)})`,
      );
    }
    for (const group of reconciliation.duplicates) {
      for (const rowId of group.rowIds) {
        addFlag(rowId, 'Possible duplicate — same date, amount, and description as another row');
      }
    }
    for (const issue of reconciliation.dateIssues) {
      addFlag(
        issue.rowId,
        issue.kind === 'outside-period'
          ? 'Date is far from the rest of the statement'
          : 'Out of order relative to the surrounding rows',
      );
    }

    return map;
  }, [reconciliation]);

  const {
    options: exportOptions,
    setOptions: setExportOptions,
    exportAs,
    lastExport,
  } = useExport(fileName, editableRows, rowFlags, reconciliation, pageIntegrity.length);

  // One shared definition of "hidden by filter" — the Output panel's count
  // and the table's own live filtering both come from the same rows, so
  // they can never disagree.
  const rowsAfterFilter = useMemo(
    () => selectRows(editableRows, rowFlags, exportOptions),
    [editableRows, rowFlags, exportOptions],
  );
  const hiddenRowCount = editableRows.length - rowsAfterFilter.length;

  const flaggedInHiddenColumnsCount = useMemo(() => {
    const { columns } = exportOptions;
    let count = 0;
    for (const row of rowsAfterFilter) {
      if (!columns.date && isFieldFlagged(row, 'date')) count += 1;
      if (!columns.description && isFieldFlagged(row, 'description')) count += 1;
      if (!columns.amount && isFieldFlagged(row, 'amount')) count += 1;
      if (!columns.balance && isFieldFlagged(row, 'balance')) count += 1;
    }
    return count;
  }, [rowsAfterFilter, exportOptions]);

  useEffect(() => {
    if (!hasEdits) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasEdits]);

  const confirmIfUnsaved = useCallback(() => {
    if (!hasEdits) return true;
    return window.confirm(UNSAVED_EDITS_MESSAGE);
  }, [hasEdits]);

  const handleReset = useCallback(() => {
    if (!confirmIfUnsaved()) return;
    reset();
  }, [confirmIfUnsaved, reset]);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (!confirmIfUnsaved()) return;
      loadFile(file);
    },
    [confirmIfUnsaved, loadFile],
  );

  const handleColumnRoleReassign = useCallback(
    (field: ColumnRole, newIndex: number) => {
      const oldIndex = columnRoles.indexOf(field);
      if (oldIndex === newIndex) return;
      // A single-instance role (date/description/balance/amount) never
      // ends up assigned to two columns at once — clear the old holder
      // before handing the role to its new column.
      if (oldIndex >= 0) setColumnRoleOverride(oldIndex, 'unknown');
      setColumnRoleOverride(newIndex, field);
    },
    [columnRoles, setColumnRoleOverride],
  );

  const MAX_PREVIEW_LENGTH = 24;
  // What a user actually recognizes a column by — its own data — not an
  // internal index. First non-empty cell per raw column, from the current
  // page's raw rows.
  const columnPreviews = useMemo(() => {
    return columnRoles.map((_, index) => {
      for (const row of cleanedRows) {
        const cell = row.cells[index]?.trim();
        if (cell) {
          return cell.length > MAX_PREVIEW_LENGTH
            ? `${cell.slice(0, MAX_PREVIEW_LENGTH)}…`
            : cell;
        }
      }
      return '';
    });
  }, [columnRoles, cleanedRows]);

  const statusText = extractionProgress
    ? `Reading PDF… (page ${extractionProgress.done} of ${extractionProgress.total})`
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {!fileName && (
        <div className="flex flex-col gap-4">
          <p className="text-center font-heading text-lg font-medium text-ink">{prompt}</p>
          <FileDropzone
            onFileSelected={handleFileSelected}
            isLoading={isLoadingFile}
            statusText={statusText}
          />
          {showLandingContent && <LandingContent />}
        </div>
      )}

      {error && <ErrorMessage error={error} onDismiss={reset} />}

      {fileName && !error && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
            <span
              className="min-w-0 flex-1 truncate font-mono text-sm text-ink"
              title={fileName}
            >
              {fileName}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="whitespace-nowrap text-sm text-ink-muted">
                {numPages} page{numPages === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="min-h-11 whitespace-nowrap rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
              >
                Change file
              </button>
            </div>
          </div>

          {isDebug && columnDetectionWarning && (
            <ColumnDetectionWarning message={columnDetectionWarning} />
          )}

          <ReconciliationPanel
            rowCount={editableRows.length}
            result={reconciliation}
            onOpeningChange={setOpeningBalanceInput}
            onClosingChange={setClosingBalanceInput}
          />

          <OutputPanel
            options={exportOptions}
            onOptionsChange={setExportOptions}
            onExport={exportAs}
            lastExport={lastExport}
            hiddenRowCount={hiddenRowCount}
            flaggedInHiddenColumnsCount={flaggedInHiddenColumnsCount}
          />

          <TransactionsSection
            fileName={fileName}
            rows={editableRows}
            onCommitEdit={commitEdit}
            onDeleteRow={deleteRow}
            onInsertRow={insertRow}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            rowFlags={rowFlags}
            columnRoles={columnRoles}
            columnPreviews={columnPreviews}
            columnShape={columnShape}
            onColumnRoleReassign={handleColumnRoleReassign}
            reconciliation={reconciliation}
            onExport={exportAs}
            options={exportOptions}
          />

          {isDebug && (
            <>
              <PageSelector
                currentPage={currentPageNumber}
                numPages={numPages}
                onChange={setCurrentPageNumber}
              />

              <IntegrityReport
                pageIntegrity={pageIntegrity}
                statementSummary={statementSummary}
              />

              <ControlsPanel
                toleranceY={toleranceY}
                onToleranceYChange={setToleranceY}
                gapX={gapX}
                onGapXChange={setGapX}
              />

              {rawStats && <StatsBar stats={rawStats} />}

              {dateFormatInfo && columnShape && (
                <ParsingSummary
                  dateFormatInfo={dateFormatInfo}
                  onDateFormatChange={setDateFormatOverride}
                  columnShape={columnShape}
                  transactionOrder={transactionOrder}
                  currentPageTransactions={currentPageTransactions}
                />
              )}

              <ExtractedTable
                cleanedRows={cleanedRows}
                columnRoles={columnRoles}
                onRoleChange={setColumnRoleOverride}
                confidenceByCell={currentPageConfidence}
              />

              <DroppedRowsPanel droppedRows={droppedRows} />
            </>
          )}
        </>
      )}
    </div>
  );
}
