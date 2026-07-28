import { useCallback, useEffect, useReducer } from 'react';
import { parseAmountWithConfidence } from '../lib/transactions/parseAmount';
import { parseDateValue } from '../lib/transactions/parseDate';
import type {
  ConfidenceLevel,
  DateFormatInfo,
  Transaction,
} from '../lib/transactions/types';

export type EditableField = 'date' | 'description' | 'amount' | 'balance';

export interface EditableTransaction {
  id: string;
  pageNumber: number | null;
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  raw: Transaction['raw'] | null;
  original: Pick<Transaction, 'date' | 'description' | 'amount' | 'balance'> | null;
  edited: Record<EditableField, boolean>;
  confidence: Record<EditableField, ConfidenceLevel>;
}

interface HistoryState {
  past: EditableTransaction[][];
  present: EditableTransaction[];
  future: EditableTransaction[][];
  everEdited: boolean;
}

type Action =
  | { type: 'SEED'; rows: EditableTransaction[] }
  | {
      type: 'EDIT_FIELD';
      id: string;
      field: EditableField;
      value: string | number | null;
    }
  | { type: 'DELETE_ROW'; id: string }
  | { type: 'INSERT_ROW'; afterId: string | null }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function seedFromTransactions(transactions: Transaction[]): EditableTransaction[] {
  return transactions.map((t) => ({
    id: crypto.randomUUID(),
    pageNumber: t.pageNumber,
    date: t.date,
    description: t.description,
    amount: t.amount,
    balance: t.balance,
    raw: t.raw,
    original: {
      date: t.date,
      description: t.description,
      amount: t.amount,
      balance: t.balance,
    },
    edited: { date: false, description: false, amount: false, balance: false },
    confidence: t.confidence,
  }));
}

function createBlankRow(): EditableTransaction {
  return {
    id: crypto.randomUUID(),
    pageNumber: null,
    date: '',
    description: '',
    amount: 0,
    balance: null,
    raw: null,
    original: null,
    edited: { date: false, description: false, amount: false, balance: false },
    // Flagged 'low' across the board so a freshly-inserted blank row shows
    // up in "N fields need review" until the user actually fills it in.
    confidence: { date: 'low', description: 'low', amount: 'low', balance: 'low' },
  };
}

function pushHistory(
  state: HistoryState,
  present: EditableTransaction[],
): HistoryState {
  return { past: [...state.past, state.present], present, future: [], everEdited: true };
}

function historyReducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case 'SEED':
      return { past: [], present: action.rows, future: [], everEdited: false };

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        everEdited: state.everEdited,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
        everEdited: state.everEdited,
      };
    }

    case 'EDIT_FIELD': {
      const present = state.present.map((row) =>
        row.id === action.id
          ? {
              ...row,
              [action.field]: action.value,
              edited: { ...row.edited, [action.field]: true },
            }
          : row,
      );
      return pushHistory(state, present);
    }

    case 'DELETE_ROW': {
      const present = state.present.filter((row) => row.id !== action.id);
      return pushHistory(state, present);
    }

    case 'INSERT_ROW': {
      const blank = createBlankRow();
      const index = action.afterId
        ? state.present.findIndex((row) => row.id === action.afterId)
        : state.present.length - 1;
      const insertAt = index + 1;
      const present = [
        ...state.present.slice(0, insertAt),
        blank,
        ...state.present.slice(insertAt),
      ];
      return pushHistory(state, present);
    }

    default:
      return state;
  }
}

const initialState: HistoryState = {
  past: [],
  present: [],
  future: [],
  everEdited: false,
};

export function useEditableTransactions(
  fileName: string | null,
  transactions: Transaction[],
  dateFormatInfo: DateFormatInfo | null,
  fallbackYear: number | null,
) {
  const [history, dispatch] = useReducer(historyReducer, initialState);

  // Hard reset on a genuinely new file, regardless of prior edits.
  useEffect(() => {
    dispatch({ type: 'SEED', rows: seedFromTransactions([]) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName]);

  // Soft re-seed whenever the live pipeline recomputes (tolerance/gap/role
  // overrides) — but only until the first edit, so tweaking those controls
  // doesn't silently erase manual fixes.
  useEffect(() => {
    if (history.everEdited) return;
    dispatch({ type: 'SEED', rows: seedFromTransactions(transactions) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  // Ctrl+Z / Ctrl+Shift+Z, unless the currently-focused element is the
  // grid's own edit input — in which case let the browser's native
  // per-input undo handle it instead of hijacking it for row-level undo.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key !== 'z' || !(event.ctrlKey || event.metaKey)) return;

      const active = document.activeElement as HTMLElement | null;
      if (active?.dataset.gridEditing === 'true') return;

      event.preventDefault();
      dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' });
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commitEdit = useCallback(
    (id: string, field: EditableField, rawValue: string): boolean => {
      const row = history.present.find((r) => r.id === id);
      if (!row) return true;

      // A click-in/click-out with no actual change shouldn't count as an
      // edit — it would otherwise clear the field's "needs review" flag
      // and push a no-op entry onto the undo stack for something the user
      // never actually touched.
      const commit = (value: string | number | null) => {
        if (row[field] === value) return true;
        dispatch({ type: 'EDIT_FIELD', id, field, value });
        return true;
      };

      if (field === 'description') {
        return commit(rawValue);
      }

      if (field === 'date') {
        const parsed = parseDateValue(
          rawValue,
          dateFormatInfo ?? { order: 'MDY', resolved: false },
          fallbackYear,
        );
        if (!parsed) return false;
        return commit(parsed.iso);
      }

      // amount or balance
      const trimmed = rawValue.trim();
      if (field === 'balance' && trimmed === '') {
        return commit(null);
      }
      const parsed = parseAmountWithConfidence(rawValue);
      if (!parsed) return false;
      return commit(parsed.value);
    },
    [dateFormatInfo, fallbackYear, history.present],
  );

  const deleteRow = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ROW', id });
  }, []);

  const insertRow = useCallback((afterId: string | null) => {
    dispatch({ type: 'INSERT_ROW', afterId });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  return {
    rows: history.present,
    hasEdits: history.everEdited,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commitEdit,
    deleteRow,
    insertRow,
    undo,
    redo,
  };
}
