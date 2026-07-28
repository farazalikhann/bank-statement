import { useCallback, useState } from 'react';
import type { EditableTransaction } from './useEditableTransactions';
import type { ReconciliationResult } from '../lib/validation/types';
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from '../lib/export/types';
import { buildCsvBlob, buildGenericCsv } from '../lib/export/csv';
import { buildQuickBooksCsv, buildXeroCsv } from '../lib/export/accountingFormats';
import { buildWorkbookBlob } from '../lib/export/excel';
import { generateFilename } from '../lib/export/filename';
import { isRowFlagged, selectRows } from '../lib/export/rowSelection';

export type ExportFormat = 'xlsx' | 'csv' | 'quickbooks' | 'xero';

function formatMoney(value: number): string {
  return Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildReconciliationSummary(result: ReconciliationResult): string {
  if (result.openingBalance === null || result.closingBalance === null) {
    return 'Not checked (no opening/closing balance entered)';
  }
  if (result.severity === 'balanced') {
    return result.balanceBreaks.length > 0
      ? `Balanced overall, ${result.balanceBreaks.length} row(s) don't chain correctly`
      : 'Balanced';
  }
  return `Off by $${formatMoney(result.difference ?? 0)}`;
}

function buildWarningMessage(
  result: ReconciliationResult,
  flaggedCount: number,
): string | null {
  const issues: string[] = [];
  if (result.openingBalance === null || result.closingBalance === null) {
    issues.push("reconciliation hasn't been checked (no opening/closing balance entered)");
  } else if (result.severity !== 'balanced') {
    issues.push(`reconciliation is off by $${formatMoney(result.difference ?? 0)}`);
  }
  if (flaggedCount > 0) {
    issues.push(`${flaggedCount} row${flaggedCount === 1 ? '' : 's'} are still flagged for review`);
  }
  if (issues.length === 0) return null;
  return `Before exporting: ${issues.join(' and ')}. Export anyway?`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExport(
  fileName: string | null,
  rows: EditableTransaction[],
  rowFlags: Map<string, string[]>,
  reconciliation: ReconciliationResult,
  pageCount: number,
) {
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);

  const exportAs = useCallback(
    (format: ExportFormat) => {
      const flaggedCount = rows.filter((row) => isRowFlagged(row, rowFlags)).length;
      const warning = buildWarningMessage(reconciliation, flaggedCount);
      if (warning && !window.confirm(warning)) return;

      const sourceName = fileName ?? 'statement';

      if (format === 'csv') {
        const csv = buildGenericCsv(rows, rowFlags, options);
        downloadBlob(buildCsvBlob(csv), generateFilename(sourceName, 'csv'));
        return;
      }
      if (format === 'quickbooks') {
        const csv = buildQuickBooksCsv(rows, rowFlags, options);
        downloadBlob(buildCsvBlob(csv), generateFilename(sourceName, 'csv', 'quickbooks'));
        return;
      }
      if (format === 'xero') {
        const csv = buildXeroCsv(rows, rowFlags, options);
        downloadBlob(buildCsvBlob(csv), generateFilename(sourceName, 'csv', 'xero'));
        return;
      }

      const selectedCount = selectRows(rows, rowFlags, options).length;
      const editedCellCount = rows.reduce(
        (sum, row) => sum + Object.values(row.edited).filter(Boolean).length,
        0,
      );
      const audit = {
        sourceFileName: sourceName,
        pageCount,
        transactionCount: selectedCount,
        reconciliationSummary: buildReconciliationSummary(reconciliation),
        editedCellCount,
        exportedAt: new Date(),
      };
      void buildWorkbookBlob(rows, rowFlags, options, audit).then((blob) => {
        downloadBlob(blob, generateFilename(sourceName, 'xlsx'));
      });
    },
    [rows, rowFlags, reconciliation, options, fileName, pageCount],
  );

  return { options, setOptions, exportAs };
}
