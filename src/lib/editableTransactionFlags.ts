import type { EditableField, EditableTransaction } from '../hooks/useEditableTransactions';

export const EDITABLE_FIELDS: EditableField[] = ['date', 'description', 'amount', 'balance'];

// A field counts as "needs review" only while it's both unedited and below
// high confidence — the moment a user touches it (even to confirm the same
// value), it's no longer the parser's guess to double-check.
export function isFieldFlagged(row: EditableTransaction, field: EditableField): boolean {
  return !row.edited[field] && row.confidence[field] !== 'high';
}

export interface FlaggedFieldRef {
  rowId: string;
  field: EditableField;
}

export function collectFlaggedFields(rows: EditableTransaction[]): FlaggedFieldRef[] {
  const flagged: FlaggedFieldRef[] = [];
  for (const row of rows) {
    for (const field of EDITABLE_FIELDS) {
      if (isFieldFlagged(row, field)) flagged.push({ rowId: row.id, field });
    }
  }
  return flagged;
}
