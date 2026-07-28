import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useVirtualRows } from '../hooks/useVirtualRows';
import type { EditableField, EditableTransaction } from '../hooks/useEditableTransactions';
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
}

const FIELDS: EditableField[] = ['date', 'description', 'amount', 'balance'];
const ROW_HEIGHT = 36;

interface SelectedCell {
  rowId: string;
  field: EditableField;
}

interface EditingCell extends SelectedCell {
  value: string;
}

function isFlagged(row: EditableTransaction, field: EditableField): boolean {
  return !row.edited[field] && row.confidence[field] !== 'high';
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDisplayValue(row: EditableTransaction, field: EditableField): string {
  switch (field) {
    case 'date':
      return row.date || '—';
    case 'description':
      return row.description || '—';
    case 'amount':
      return formatAmount(row.amount);
    case 'balance':
      return row.balance === null ? '—' : formatAmount(row.balance);
  }
}

function getEditValue(row: EditableTransaction, field: EditableField): string {
  switch (field) {
    case 'date':
      return row.date;
    case 'description':
      return row.description;
    case 'amount':
      return String(row.amount);
    case 'balance':
      return row.balance === null ? '' : String(row.balance);
  }
}

function getOriginalDisplay(
  row: EditableTransaction,
  field: EditableField,
): string | null {
  if (!row.original || !row.edited[field]) return null;
  switch (field) {
    case 'date':
      return row.original.date || '(none)';
    case 'description':
      return row.original.description || '(none)';
    case 'amount':
      return formatAmount(row.original.amount);
    case 'balance':
      return row.original.balance === null
        ? '(none)'
        : formatAmount(row.original.balance);
  }
}

function cellKey(rowId: string, field: EditableField): string {
  return `${rowId}:${field}`;
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
}: TransactionGridProps) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editError, setEditError] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const selectAllOnFocusRef = useRef(false);
  const suppressNextBlurRef = useRef(false);
  const cellRefs = useRef(new Map<string, HTMLTableCellElement>());

  const {
    containerRef,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight,
    onScroll,
    scrollToIndex,
  } = useVirtualRows({ rowCount: rows.length, rowHeight: ROW_HEIGHT });

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
    (rowId: string, field: EditableField, selectAll: boolean) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;
      selectAllOnFocusRef.current = selectAll;
      setEditError(false);
      setEditing({ rowId, field, value: getEditValue(row, field) });
    },
    [rows],
  );

  const commitCurrentEdit = useCallback((): boolean => {
    if (!editing) return true;
    const ok = onCommitEdit(editing.rowId, editing.field, editing.value);
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
      if (rowIndex < 0 || rowIndex >= rows.length) return;
      if (fieldIndex < 0 || fieldIndex >= FIELDS.length) return;
      const row = rows[rowIndex];
      const field = FIELDS[fieldIndex];
      setSelected({ rowId: row.id, field });
      scrollToIndex(rowIndex);
      if (enterEdit) startEditing(row.id, field, selectAll);
    },
    [rows, scrollToIndex, startEditing],
  );

  const handleCellClick = useCallback(
    (rowId: string, field: EditableField) => {
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
        moveSelectionTo(rowIndex + 1, fieldIndex, rowIndex + 1 < rows.length, false);
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
          nextField = FIELDS.length - 1;
          nextRow -= 1;
        } else if (nextField >= FIELDS.length) {
          nextField = 0;
          nextRow += 1;
        }
        moveSelectionTo(nextRow, nextField, nextRow >= 0 && nextRow < rows.length, true);
      }
    },
    [commitCurrentEdit, moveSelectionTo, rows.length],
  );

  const handleInputBlur = useCallback(() => {
    if (suppressNextBlurRef.current) return;
    commitCurrentEdit();
  }, [commitCurrentEdit]);

  const flaggedCount = useMemo(() => {
    let count = 0;
    for (const row of rows) {
      for (const field of FIELDS) {
        if (isFlagged(row, field)) count += 1;
      }
    }
    return count;
  }, [rows]);

  const jumpToNextFlagged = useCallback(() => {
    const total = rows.length * FIELDS.length;
    if (total === 0) return;
    const currentRowIndex = selected ? rows.findIndex((r) => r.id === selected.rowId) : -1;
    const currentFieldIndex = selected ? FIELDS.indexOf(selected.field) : -1;
    const currentFlat = currentRowIndex < 0 ? -1 : currentRowIndex * FIELDS.length + currentFieldIndex;

    for (let step = 1; step <= total; step++) {
      const flat = (currentFlat + step + total) % total;
      const rowIndex = Math.floor(flat / FIELDS.length);
      const fieldIndex = flat % FIELDS.length;
      const row = rows[rowIndex];
      const field = FIELDS[fieldIndex];
      if (isFlagged(row, field)) {
        setSelected({ rowId: row.id, field });
        scrollToIndex(rowIndex);
        return;
      }
    }
  }, [rows, selected, scrollToIndex]);

  const selectedRow = selected ? rows.find((r) => r.id === selected.rowId) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      <TransactionGridToolbar
        rowCount={rows.length}
        flaggedCount={flaggedCount}
        onJumpNext={jumpToNextFlagged}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onAddRow={() => onInsertRow(null)}
      />

      {rows.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-line bg-surface p-12 text-sm text-ink-muted">
          No transactions yet. Use "+ Add row" to add one.
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="max-h-[60vh] overflow-auto rounded-md border border-line bg-surface"
        >
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: '130px' }} />
              <col />
              <col style={{ width: '130px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '56px' }} />
            </colgroup>
            <thead className="sticky top-0 bg-canvas">
              <tr>
                <th className="border-b border-line px-3 py-2 text-left font-sans font-medium text-ink-muted">
                  Date
                </th>
                <th className="border-b border-line px-3 py-2 text-left font-sans font-medium text-ink-muted">
                  Description
                </th>
                <th className="border-b border-line px-3 py-2 text-right font-sans font-medium text-ink-muted">
                  Amount
                </th>
                <th className="border-b border-line px-3 py-2 text-right font-sans font-medium text-ink-muted">
                  Balance
                </th>
                <th className="border-b border-line px-2 py-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: topSpacerHeight }} aria-hidden="true">
                <td colSpan={5} className="p-0" />
              </tr>
              {rows.slice(startIndex, endIndex).map((row, i) => {
                const rowIndex = startIndex + i;
                const isRowSelected = selected?.rowId === row.id;
                return (
                  <tr
                    key={row.id}
                    style={{ height: ROW_HEIGHT }}
                    className={isRowSelected ? 'bg-accent-soft/40' : ''}
                  >
                    {FIELDS.map((field, fieldIndex) => {
                      const isEditing =
                        editing?.rowId === row.id && editing.field === field;
                      const isSelected =
                        selected?.rowId === row.id && selected.field === field;
                      const flagged = isFlagged(row, field);
                      const original = getOriginalDisplay(row, field);
                      const alignClass =
                        field === 'amount' || field === 'balance'
                          ? 'text-right'
                          : 'text-left';

                      if (isEditing) {
                        return (
                          <td key={field} className="border-b border-line p-0">
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
                          key={field}
                          ref={(el) => {
                            if (el) cellRefs.current.set(cellKey(row.id, field), el);
                            else cellRefs.current.delete(cellKey(row.id, field));
                          }}
                          tabIndex={0}
                          onClick={() => handleCellClick(row.id, field)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIndex, fieldIndex)}
                          onFocus={() => setSelected({ rowId: row.id, field })}
                          title={original ? `Originally: ${original}` : undefined}
                          className={`cursor-text overflow-hidden text-ellipsis whitespace-nowrap border-b border-line px-3 py-1.5 font-mono text-sm text-ink ${alignClass} ${
                            isSelected ? 'ring-2 ring-inset ring-accent' : ''
                          }`}
                        >
                          <span
                            className={
                              flagged
                                ? 'underline decoration-warn decoration-dotted underline-offset-4'
                                : ''
                            }
                          >
                            {getDisplayValue(row, field)}
                          </span>
                          {row.edited[field] && (
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
                          const issues = rowFlags?.get(row.id);
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
                <td colSpan={5} className="p-0" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <TransactionDetailPanel row={selectedRow} />
    </div>
  );
}
