import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useVirtualRows } from '../hooks/useVirtualRows';
import type { EditableField, EditableTransaction } from '../hooks/useEditableTransactions';
import type { ColumnRole } from '../lib/pdf/types';
import type { ColumnShape } from '../lib/transactions/types';
import type { ExportOptions } from '../lib/export/types';
import { selectRows } from '../lib/export/rowSelection';
import { isFieldFlagged } from '../lib/editableTransactionFlags';
import {
  DISPLAY_COLUMN_LABEL,
  computeDisplayColumns,
  getDisplayValue,
  getEditValue,
  getOriginalDisplay,
  resolveEditCommit,
  underlyingFieldFor,
  type DisplayColumn,
} from '../lib/transactionDisplay';
import { TransactionGridToolbar } from './TransactionGridToolbar';
import { TransactionDetailPanel } from './TransactionDetailPanel';

interface TransactionGridProps {
  rows: EditableTransaction[];
  onCommitEdit: (id: string, field: EditableField, rawValue: string) => boolean;
  onDeleteRow: (id: string) => void;
  onInsertRow: (afterId: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Row-scoped validation issues (balance breaks, duplicates, date issues)
  // — deliberately separate from the per-cell confidence flagging below,
  // since these are whole-row concerns (a balance break isn't "wrong" in
  // one cell) rather than a single field's parse confidence.
  rowFlags?: Map<string, string[]>;
  // Raw-column role state for the header's "which column is this field"
  // pickers, and the column shape that decides whether Amount even has a
  // single source column to point at.
  columnRoles: ColumnRole[];
  // First non-empty data value per raw column index — shown in the column
  // picker instead of an internal "Column N" label, since that's what a
  // user actually recognizes a column by.
  columnPreviews: string[];
  columnShape: ColumnShape | null;
  onColumnRoleReassign: (field: ColumnRole, newIndex: number) => void;
  // Output settings — which columns show, date format, signed vs split
  // amount, and whether flagged rows are included. The table renders
  // exactly what these say, live, same as the export would produce.
  options: ExportOptions;
  // "View as table" mode on narrow screens: the table becomes horizontally
  // scrollable with the Date column pinned so there's always date context
  // regardless of scroll position. No effect on desktop, which never sets
  // this — desktop's layout stays exactly as it was.
  freezeDateColumn?: boolean;
}

const ROW_HEIGHT = 36;
const EMPTY_ROW_FLAGS: Map<string, string[]> = new Map();

const COLUMN_WIDTH: Partial<Record<DisplayColumn, string>> = {
  date: '130px',
  debit: '110px',
  credit: '110px',
  amount: '130px',
  balance: '130px',
  pageNumber: '90px',
};

interface SelectedCell {
  rowId: string;
  field: DisplayColumn;
}

interface EditingCell extends SelectedCell {
  value: string;
}

function cellKey(rowId: string, field: DisplayColumn): string {
  return `${rowId}:${field}`;
}

// Amount has no single source column to point at once Debit/Credit are two
// separate raw columns merged into one signed value; the reverse is true
// when the statement never had separate debit/credit columns at all — the
// split shown here is a display-only computation, not a real column to
// reassign.
function isFixColumnDisabled(column: DisplayColumn, columnShape: ColumnShape | null): boolean {
  if (column === 'amount') return columnShape?.kind === 'debit-credit';
  if (column === 'debit' || column === 'credit') return columnShape?.kind !== 'debit-credit';
  return false;
}

export function TransactionGrid({
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
  options,
  freezeDateColumn = false,
}: TransactionGridProps) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editError, setEditError] = useState(false);
  // Off by default — when detection is already right (the common case),
  // a row of raw-column pickers above the data is pure noise.
  const [showColumnFixer, setShowColumnFixer] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const selectAllOnFocusRef = useRef(false);
  const suppressNextBlurRef = useRef(false);
  const cellRefs = useRef(new Map<string, HTMLTableCellElement>());

  const effectiveRowFlags = rowFlags ?? EMPTY_ROW_FLAGS;

  const displayColumns = useMemo(() => computeDisplayColumns(options), [options]);

  // Same helper the export uses — the table can never show a different set
  // of rows than what "include flagged" would actually export.
  const visibleRows = useMemo(
    () => selectRows(rows, effectiveRowFlags, options),
    [rows, effectiveRowFlags, options],
  );

  const {
    containerRef,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight,
    onScroll,
    scrollToIndex,
  } = useVirtualRows({ rowCount: visibleRows.length, rowHeight: ROW_HEIGHT });

  // If the selected/editing cell's row or column drops out from under it
  // (a column gets hidden mid-edit, or the row gets filtered out), nothing
  // should keep pointing at a cell that no longer renders.
  useEffect(() => {
    if (!selected) return;
    const rowStillVisible = visibleRows.some((r) => r.id === selected.rowId);
    const columnStillVisible = displayColumns.includes(selected.field);
    if (!rowStillVisible || !columnStillVisible) {
      setSelected(null);
      setEditing(null);
    }
  }, [visibleRows, displayColumns, selected]);

  // Deliberately keyed on rowId/field, not the whole `editing` object: this
  // should only focus/select when a *new* cell starts editing, not on every
  // keystroke (which `editing.value` changing would otherwise trigger,
  // fighting the user's cursor position while typing).
  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      if (selectAllOnFocusRef.current) {
        editInputRef.current.select();
      } else {
        const len = editInputRef.current.value.length;
        editInputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editing?.rowId, editing?.field]);

  useEffect(() => {
    if (!selected || editing) return;
    cellRefs.current.get(cellKey(selected.rowId, selected.field))?.focus();
  }, [selected, editing]);

  const startEditing = useCallback(
    (rowId: string, field: DisplayColumn, selectAll: boolean) => {
      if (!underlyingFieldFor(field)) return; // pageNumber: not editable
      const row = visibleRows.find((r) => r.id === rowId);
      if (!row) return;
      selectAllOnFocusRef.current = selectAll;
      setEditError(false);
      setEditing({ rowId, field, value: getEditValue(row, field) });
    },
    [visibleRows],
  );

  const commitCurrentEdit = useCallback((): boolean => {
    if (!editing) return true;
    const resolved = resolveEditCommit(editing.field, editing.value);
    if (!resolved) return true;
    const ok = onCommitEdit(editing.rowId, resolved.field, resolved.value);
    if (ok) {
      setEditing(null);
      setEditError(false);
    } else {
      setEditError(true);
    }
    return ok;
  }, [editing, onCommitEdit]);

  const moveSelectionTo = useCallback(
    (rowIndex: number, fieldIndex: number, enterEdit: boolean, selectAll: boolean) => {
      if (rowIndex < 0 || rowIndex >= visibleRows.length) return;
      if (fieldIndex < 0 || fieldIndex >= displayColumns.length) return;
      const row = visibleRows[rowIndex];
      const field = displayColumns[fieldIndex];
      setSelected({ rowId: row.id, field });
      scrollToIndex(rowIndex);
      if (enterEdit) startEditing(row.id, field, selectAll);
    },
    [visibleRows, displayColumns, scrollToIndex, startEditing],
  );

  const handleCellClick = useCallback(
    (rowId: string, field: DisplayColumn) => {
      setSelected({ rowId, field });
      startEditing(rowId, field, true);
    },
    [startEditing],
  );

  const handleCellKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableCellElement>, rowIndex: number, fieldIndex: number) => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          moveSelectionTo(rowIndex, fieldIndex, true, false);
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveSelectionTo(rowIndex - 1, fieldIndex, false, false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveSelectionTo(rowIndex + 1, fieldIndex, false, false);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveSelectionTo(rowIndex, fieldIndex - 1, false, false);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveSelectionTo(rowIndex, fieldIndex + 1, false, false);
          break;
        default:
          break;
      }
    },
    [moveSelectionTo],
  );

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, fieldIndex: number) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setEditing(null);
        setEditError(false);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        suppressNextBlurRef.current = true;
        const ok = commitCurrentEdit();
        suppressNextBlurRef.current = false;
        if (!ok) return;
        moveSelectionTo(rowIndex + 1, fieldIndex, rowIndex + 1 < visibleRows.length, false);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        suppressNextBlurRef.current = true;
        const ok = commitCurrentEdit();
        suppressNextBlurRef.current = false;
        if (!ok) return;
        const delta = event.shiftKey ? -1 : 1;
        let nextField = fieldIndex + delta;
        let nextRow = rowIndex;
        if (nextField < 0) {
          nextField = displayColumns.length - 1;
          nextRow -= 1;
        } else if (nextField >= displayColumns.length) {
          nextField = 0;
          nextRow += 1;
        }
        moveSelectionTo(nextRow, nextField, nextRow >= 0 && nextRow < visibleRows.length, true);
      }
    },
    [commitCurrentEdit, moveSelectionTo, visibleRows.length, displayColumns.length],
  );

  const handleInputBlur = useCallback(() => {
    if (suppressNextBlurRef.current) return;
    commitCurrentEdit();
  }, [commitCurrentEdit]);

  // Debit and credit share one underlying `amount` — dedupe by field so a
  // flagged amount counts once regardless of whether it's shown as one
  // column or split into two.
  const visibleUnderlyingFields = useMemo(() => {
    const fields = new Set<EditableField>();
    for (const column of displayColumns) {
      const field = underlyingFieldFor(column);
      if (field) fields.add(field);
    }
    return [...fields];
  }, [displayColumns]);

  const flaggedCount = useMemo(() => {
    let count = 0;
    for (const row of visibleRows) {
      for (const field of visibleUnderlyingFields) {
        if (isFieldFlagged(row, field)) count += 1;
      }
    }
    return count;
  }, [visibleRows, visibleUnderlyingFields]);

  const jumpToNextFlagged = useCallback(() => {
    const total = visibleRows.length * displayColumns.length;
    if (total === 0) return;
    const currentRowIndex = selected ? visibleRows.findIndex((r) => r.id === selected.rowId) : -1;
    const currentFieldIndex = selected ? displayColumns.indexOf(selected.field) : -1;
    const currentFlat =
      currentRowIndex < 0 ? -1 : currentRowIndex * displayColumns.length + currentFieldIndex;

    for (let step = 1; step <= total; step++) {
      const flat = (currentFlat + step + total) % total;
      const rowIndex = Math.floor(flat / displayColumns.length);
      const fieldIndex = flat % displayColumns.length;
      const row = visibleRows[rowIndex];
      const column = displayColumns[fieldIndex];
      const field = underlyingFieldFor(column);
      if (field && isFieldFlagged(row, field)) {
        setSelected({ rowId: row.id, field: column });
        scrollToIndex(rowIndex);
        return;
      }
    }
  }, [visibleRows, displayColumns, selected, scrollToIndex]);

  const selectedRow = selected ? visibleRows.find((r) => r.id === selected.rowId) ?? null : null;
  const colCount = displayColumns.length + 1; // + the actions column

  return (
    <div className="flex flex-col gap-3">
      <TransactionGridToolbar
        rowCount={visibleRows.length}
        flaggedCount={flaggedCount}
        onJumpNext={jumpToNextFlagged}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onAddRow={() => onInsertRow(null)}
      />

      {columnRoles.length > 0 && (
        <button
          type="button"
          onClick={() => setShowColumnFixer((prev) => !prev)}
          className="self-end text-sm font-medium text-accent hover:underline"
        >
          {showColumnFixer ? 'Done fixing columns' : 'Fix columns'}
        </button>
      )}

      {displayColumns.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-line bg-surface p-12 text-sm text-ink-muted">
          No columns selected — turn one on in Output above.
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-line bg-surface p-12 text-sm text-ink-muted">
          No transactions yet. Use "+ Add row" to add one.
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-line bg-surface p-12 text-sm text-ink-muted">
          All rows are hidden by the current filter — check "Include rows
          still flagged for review" in Output.
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="max-h-[60vh] overflow-auto rounded-md border border-line bg-surface"
        >
          <table
            className={`border-collapse text-sm ${freezeDateColumn ? 'w-max min-w-full table-fixed' : 'w-full table-fixed'}`}
          >
            <colgroup>
              {displayColumns.map((column) => (
                <col
                  key={column}
                  style={
                    column === 'description'
                      ? freezeDateColumn
                        ? { width: '220px' }
                        : undefined
                      : { width: COLUMN_WIDTH[column] }
                  }
                />
              ))}
              <col style={{ width: '56px' }} />
            </colgroup>
            <thead className="sticky top-0 bg-canvas">
              <tr>
                {displayColumns.map((column) => {
                  const alignClass =
                    column === 'amount' || column === 'debit' || column === 'credit' || column === 'balance'
                      ? 'text-right'
                      : 'text-left';
                  const disabled = isFixColumnDisabled(column, columnShape);
                  const currentIndex =
                    column === 'pageNumber' ? -1 : columnRoles.indexOf(column as ColumnRole);
                  const frozen = freezeDateColumn && column === 'date';
                  const showPicker =
                    showColumnFixer && !disabled && columnRoles.length > 0 && column !== 'pageNumber';
                  return (
                    <th
                      key={column}
                      className={`border-b border-line px-3 py-2 font-sans font-medium text-ink-muted ${alignClass} ${
                        frozen ? 'sticky left-0 z-10 border-r border-line bg-canvas' : ''
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 ${alignClass === 'text-right' ? 'justify-end' : ''}`}
                      >
                        <span>{DISPLAY_COLUMN_LABEL[column]}</span>
                        {showPicker && (
                          <select
                            value={currentIndex}
                            onChange={(event) =>
                              onColumnRoleReassign(column as ColumnRole, Number(event.target.value))
                            }
                            aria-label={`Which column is ${DISPLAY_COLUMN_LABEL[column]}`}
                            className="max-w-28 rounded border border-line-strong bg-surface px-1 py-0.5 text-xs font-medium text-ink"
                          >
                            {currentIndex < 0 && <option value={-1}>—</option>}
                            {columnRoles.map((_, index) => (
                              <option key={index} value={index}>
                                {columnPreviews[index] || `Column ${index + 1}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="border-b border-line px-2 py-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: topSpacerHeight }} aria-hidden="true">
                <td colSpan={colCount} className="p-0" />
              </tr>
              {visibleRows.slice(startIndex, endIndex).map((row, i) => {
                const rowIndex = startIndex + i;
                const isRowSelected = selected?.rowId === row.id;
                return (
                  <tr
                    key={row.id}
                    style={{ height: ROW_HEIGHT }}
                    className={isRowSelected ? 'bg-accent-soft/40' : ''}
                  >
                    {displayColumns.map((column, fieldIndex) => {
                      const underlyingField = underlyingFieldFor(column);
                      const isEditing =
                        editing?.rowId === row.id && editing.field === column;
                      const isSelected =
                        selected?.rowId === row.id && selected.field === column;
                      const flagged = underlyingField
                        ? isFieldFlagged(row, underlyingField)
                        : false;
                      const original = getOriginalDisplay(row, column);
                      const alignClass =
                        column === 'amount' || column === 'debit' || column === 'credit' || column === 'balance'
                          ? 'text-right'
                          : 'text-left';
                      const frozen = freezeDateColumn && column === 'date';
                      const frozenBg = isRowSelected ? 'bg-accent-soft' : 'bg-surface';

                      if (isEditing) {
                        return (
                          <td
                            key={column}
                            className={`border-b border-line p-0 ${frozen ? `sticky left-0 z-10 border-r ${frozenBg}` : ''}`}
                          >
                            <input
                              ref={editInputRef}
                              data-grid-editing="true"
                              value={editing.value}
                              onChange={(e) =>
                                setEditing({ ...editing, value: e.target.value })
                              }
                              onKeyDown={(e) =>
                                handleInputKeyDown(e, rowIndex, fieldIndex)
                              }
                              onBlur={handleInputBlur}
                              className={`w-full bg-accent-soft px-3 py-1.5 font-mono text-sm text-ink outline-none ${alignClass} ${
                                editError ? 'ring-2 ring-inset ring-danger' : ''
                              }`}
                            />
                          </td>
                        );
                      }

                      return (
                        <td
                          key={column}
                          ref={(el) => {
                            if (el) cellRefs.current.set(cellKey(row.id, column), el);
                            else cellRefs.current.delete(cellKey(row.id, column));
                          }}
                          tabIndex={0}
                          onClick={() => handleCellClick(row.id, column)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIndex, fieldIndex)}
                          onFocus={() => setSelected({ rowId: row.id, field: column })}
                          title={original ? `Originally: ${original}` : undefined}
                          className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-line px-3 py-1.5 font-mono text-sm text-ink ${alignClass} ${
                            underlyingField ? 'cursor-text' : 'cursor-default text-ink-muted'
                          } ${isSelected ? 'ring-2 ring-inset ring-accent' : ''} ${
                            frozen ? `sticky left-0 z-10 border-r ${frozenBg}` : ''
                          }`}
                        >
                          <span
                            className={
                              flagged
                                ? 'underline decoration-warn decoration-dotted underline-offset-4'
                                : ''
                            }
                          >
                            {getDisplayValue(row, column, options.dateFormat)}
                          </span>
                          {underlyingField && row.edited[underlyingField] && (
                            <span
                              aria-hidden="true"
                              className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-line px-1 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(() => {
                          const issues = effectiveRowFlags.get(row.id);
                          if (!issues || issues.length === 0) return null;
                          return (
                            <span
                              title={issues.join('\n')}
                              aria-label={`${issues.length} issue${issues.length === 1 ? '' : 's'} with this row`}
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warn-soft text-xs font-semibold text-warn"
                            >
                              !
                            </span>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertRow(row.id);
                          }}
                          title="Insert row below"
                          className="rounded px-1 text-ink-muted transition-colors hover:text-accent"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRow(row.id);
                          }}
                          title="Delete row"
                          className="rounded px-1 text-ink-muted transition-colors hover:text-danger"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ height: bottomSpacerHeight }} aria-hidden="true">
                <td colSpan={colCount} className="p-0" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <TransactionDetailPanel row={selectedRow} />
    </div>
  );
}
