import { useCallback, useEffect, useMemo } from 'react';
import { usePdfExtraction } from './hooks/usePdfExtraction';
import { useEditableTransactions } from './hooks/useEditableTransactions';
import { useReconciliation } from './hooks/useReconciliation';
import { useExport } from './hooks/useExport';
import { FileDropzone } from './components/FileDropzone';
import { ErrorMessage } from './components/ErrorMessage';
import { PageSelector } from './components/PageSelector';
import { ControlsPanel } from './components/ControlsPanel';
import { StatsBar } from './components/StatsBar';
import { ExtractedTable } from './components/ExtractedTable';
import { DroppedRowsPanel } from './components/DroppedRowsPanel';
import { ParsingSummary } from './components/ParsingSummary';
import { IntegrityReport } from './components/IntegrityReport';
import { TransactionGrid } from './components/TransactionGrid';
import { ReconciliationPanel } from './components/ReconciliationPanel';
import { ExportPanel } from './components/ExportPanel';

function formatMoney(value: number): string {
  return Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const UNSAVED_EDITS_MESSAGE =
  'You have unsaved edits in the transaction table. They exist only in this tab and will be lost. Continue anyway?';

function App() {
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
  } = useExport(fileName, editableRows, rowFlags, reconciliation, pageIntegrity.length);

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

  const statusText = extractionProgress
    ? `Reading PDF… (page ${extractionProgress.done} of ${extractionProgress.total})`
    : undefined;

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
          StatementKit
        </h1>
        <p className="text-sm text-ink-muted">
          Convert bank statement PDFs into clean, structured data — entirely
          in your browser. Nothing is uploaded.
        </p>
      </header>

      <main className="flex flex-col gap-6">
        {!fileName && (
          <FileDropzone
            onFileSelected={handleFileSelected}
            isLoading={isLoadingFile}
            statusText={statusText}
          />
        )}

        {error && <ErrorMessage error={error} onDismiss={reset} />}

        {fileName && !error && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
              <span
                className="truncate font-mono text-sm text-ink"
                title={fileName}
              >
                {fileName}
              </span>
              <div className="flex items-center gap-4">
                <PageSelector
                  currentPage={currentPageNumber}
                  numPages={numPages}
                  onChange={setCurrentPageNumber}
                />
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
                >
                  Choose a different file
                </button>
              </div>
            </div>

            <ReconciliationPanel
              rowCount={editableRows.length}
              result={reconciliation}
              onOpeningChange={setOpeningBalanceInput}
              onClosingChange={setClosingBalanceInput}
            />

            <TransactionGrid
              rows={editableRows}
              onCommitEdit={commitEdit}
              onDeleteRow={deleteRow}
              onInsertRow={insertRow}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              rowFlags={rowFlags}
            />

            <ExportPanel
              options={exportOptions}
              onOptionsChange={setExportOptions}
              onExport={exportAs}
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
      </main>

      <footer className="mt-auto pt-6 text-sm text-ink-muted">
        Files never leave this device — all processing happens locally in
        your browser.
      </footer>
    </div>
  );
}

export default App;
