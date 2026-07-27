export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface Row {
  y: number;
  items: TextItem[];
}

export interface ColumnCluster {
  index: number;
  start: number;
  end: number;
}

export interface ExtractionStats {
  itemCount: number;
  rowCount: number;
  columnCount: number;
  columnConsistencyPct: number;
}

export interface PageExtraction {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  items: TextItem[];
}

export interface AnalyzedPage {
  rows: Row[];
  columns: ColumnCluster[];
  stats: ExtractionStats;
}

export interface RowGroupingOptions {
  toleranceY: number;
}

export interface ColumnDetectionOptions {
  gapX: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ColumnRole =
  | 'date'
  | 'description'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'balance'
  | 'unknown';

export type DropReason =
  | 'above-first-date'
  | 'repeated-across-pages'
  | 'single-cell-no-amount'
  | 'page-number';

export interface CleanedRow {
  cells: string[];
  mergedLineCount: number;
  mergedIntoIndex: number;
}

export interface DroppedRow {
  cells: string[];
  reason: DropReason;
}
