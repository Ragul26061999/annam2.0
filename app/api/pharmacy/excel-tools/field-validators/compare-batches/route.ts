import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

type ParsedSheetRow = {
  row: number;
  batch: string;
  raw: Record<string, any>;
};

type ParsedExcel = {
  fileName: string;
  headerRow: string[];
  batchHeader: string;
  rows: ParsedSheetRow[];
  errors: { sheet: string; row: number; message: string }[];
};

type RowComparison = {
  file: 'A' | 'B';
  row: number;
  batch: string;
  status: 'match' | 'missing_in_other' | 'empty';
};

type CompareResult = {
  success: true;
  fileA: { fileName: string; totalRows: number; batchHeader: string; emptyBatchRows: number; uniqueBatches: number };
  fileB: { fileName: string; totalRows: number; batchHeader: string; emptyBatchRows: number; uniqueBatches: number };
  matches: { uniqueMatched: number; totalMatchedRowsA: number; totalMatchedRowsB: number };
  missing: { uniqueMissingInB: number; uniqueMissingInA: number };
  duplicates: { duplicatesInA: number; duplicatesInB: number };
  rowResults: RowComparison[];
  errors: { sheet: string; row: number; message: string }[];
};

function normalizeHeader(v: any): string {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Batch-related normalized header names we recognize */
const BATCH_ALIASES = new Set(['batch', 'batchno', 'batchnumber', 'batchcode', 'lotno', 'lotnumber']);

function isBatchHeader(norm: string, hintNorm: string): boolean {
  if (norm === hintNorm) return true;
  if (hintNorm === 'batch' && BATCH_ALIASES.has(norm)) return true;
  return false;
}

/**
 * Given a 2-D array of rows (each row is an array of cell values),
 * find the header row index (0-based) by scanning the first `scanRows` rows
 * for a cell that looks like a batch column. Returns { headerRowIdx, batchColIdx }.
 */
function detectHeaderRow(
  rowsAsArrays: any[][],
  hintNorm: string,
  scanRows = 5,
): { headerRowIdx: number; batchColIdx: number } {
  for (let i = 0; i < Math.min(scanRows, rowsAsArrays.length); i++) {
    const row = rowsAsArrays[i] || [];
    for (let c = 0; c < row.length; c++) {
      const norm = normalizeHeader(row[c]);
      if (!norm) continue;
      if (isBatchHeader(norm, hintNorm)) {
        return { headerRowIdx: i, batchColIdx: c };
      }
    }
  }
  return { headerRowIdx: 0, batchColIdx: -1 };
}

async function parseExcelFile(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  batchHeaderHint?: string,
): Promise<ParsedExcel> {
  const errors: { sheet: string; row: number; message: string }[] = [];
  const lowerName = fileName.toLowerCase();
  const hintNorm = normalizeHeader(batchHeaderHint || 'batch');

  // ── .xls path ────────────────────────────────────────────────────────────
  if (lowerName.endsWith('.xls') && !lowerName.endsWith('.xlsx')) {
    try {
      const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          fileName,
          headerRow: [],
          batchHeader: batchHeaderHint || 'batch',
          rows: [],
          errors: [{ sheet: '(none)', row: 0, message: 'No sheets found' }],
        };
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rowsAsArrays = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
      }) as any[][];

      const { headerRowIdx, batchColIdx } = detectHeaderRow(rowsAsArrays, hintNorm);

      const headerRow = (rowsAsArrays[headerRowIdx] || []).map((h: unknown) =>
        String(h ?? '').trim(),
      );

      if (batchColIdx === -1) {
        errors.push({
          sheet: firstSheetName,
          row: headerRowIdx + 1,
          message: `Could not find batch column. Looking for header like "${batchHeaderHint || 'batch'}"`,
        });
      }

      const batchHeader =
        batchColIdx >= 0 ? headerRow[batchColIdx] || 'batch' : batchHeaderHint || 'batch';

      const parsedRows: ParsedSheetRow[] = [];
      for (let i = headerRowIdx + 1; i < rowsAsArrays.length; i++) {
        const r = rowsAsArrays[i] || [];
        const excelRowNumber = i + 1; // 1-based

        const raw: Record<string, any> = {};
        for (let c = 0; c < headerRow.length; c++) {
          const key = headerRow[c] || `col_${c + 1}`;
          raw[key] = r[c] ?? null;
        }

        const batch = batchColIdx >= 0 ? String(r[batchColIdx] ?? '').trim() : '';

        const isCompletelyEmpty = Object.values(raw).every((v) => {
          if (v == null) return true;
          return String(v).trim() === '';
        });
        if (isCompletelyEmpty) continue;

        parsedRows.push({ row: excelRowNumber, batch, raw });
      }

      return { fileName, headerRow, batchHeader, rows: parsedRows, errors };
    } catch (e: any) {
      return {
        fileName,
        headerRow: [],
        batchHeader: batchHeaderHint || 'batch',
        rows: [],
        errors: [
          {
            sheet: '(unknown)',
            row: 0,
            message: `Failed to parse .xls file: ${e?.message || 'unknown error'}`,
          },
        ],
      };
    }
  }

  // ── .xlsx path ────────────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer as any);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return {
      fileName,
      headerRow: [],
      batchHeader: batchHeaderHint || 'batch',
      rows: [],
      errors: [{ sheet: '(none)', row: 0, message: 'No sheets found' }],
    };
  }

  // Read the first scanRows rows as 2-D array so detectHeaderRow can work on them
  const scanRows = Math.min(5, worksheet.rowCount);
  const previewRows: any[][] = [];
  for (let r = 1; r <= scanRows; r++) {
    const cells: any[] = [];
    worksheet.getRow(r).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cell.value;
    });
    previewRows.push(cells);
  }

  const { headerRowIdx, batchColIdx } = detectHeaderRow(previewRows, hintNorm);
  const actualHeaderRowNum = headerRowIdx + 1; // ExcelJS rows are 1-based

  const headerRow: string[] = [];
  worksheet.getRow(actualHeaderRowNum).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headerRow[colNumber - 1] = String(cell.value ?? '').trim();
  });

  if (batchColIdx === -1) {
    errors.push({
      sheet: worksheet.name,
      row: actualHeaderRowNum,
      message: `Could not find batch column. Looking for header like "${batchHeaderHint || 'batch'}"`,
    });
  }

  const batchHeader =
    batchColIdx >= 0 ? headerRow[batchColIdx] || 'batch' : batchHeaderHint || 'batch';

  const parsedRows: ParsedSheetRow[] = [];
  for (let rowNum = actualHeaderRowNum + 1; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);

    const raw: Record<string, any> = {};
    for (let c = 0; c < headerRow.length; c++) {
      const key = headerRow[c] || `col_${c + 1}`;
      raw[key] = row.getCell(c + 1).value;
    }

    const batch = batchColIdx >= 0 ? String(row.getCell(batchColIdx + 1).value ?? '').trim() : '';

    const isCompletelyEmpty = Object.values(raw).every((v) => {
      if (v == null) return true;
      return String(v).trim() === '';
    });
    if (isCompletelyEmpty) continue;

    parsedRows.push({ row: rowNum, batch, raw });
  }

  return { fileName, headerRow, batchHeader, rows: parsedRows, errors };
}

function summarize(parsed: ParsedExcel) {
  const batchValues = parsed.rows.map((r) => r.batch).filter((b) => b.trim() !== '');
  const unique = new Set(batchValues);
  const emptyBatchRows = parsed.rows.filter((r) => r.batch.trim() === '').length;

  const counts = new Map<string, number>();
  for (const b of batchValues) counts.set(b, (counts.get(b) || 0) + 1);
  const duplicates = Array.from(counts.values()).reduce((acc, n) => acc + Math.max(0, n - 1), 0);

  return { totalRows: parsed.rows.length, emptyBatchRows, uniqueBatches: unique.size, duplicates, batchSet: unique, batchCounts: counts };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileA = formData.get('fileA') as File | null;
    const fileB = formData.get('fileB') as File | null;
    const batchHeader = String(formData.get('batchHeader') || 'batch');

    if (!fileA || !fileB) {
      return NextResponse.json({ error: 'Both files are required (fileA and fileB)' }, { status: 400 });
    }

    const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);

    const parsedA = await parseExcelFile(bufA, fileA.name, batchHeader);
    const parsedB = await parseExcelFile(bufB, fileB.name, batchHeader);

    const errors = [...parsedA.errors, ...parsedB.errors];

    const sumA = summarize(parsedA);
    const sumB = summarize(parsedB);

    const matchedUnique = new Set<string>();
    for (const b of sumA.batchSet) {
      if (sumB.batchSet.has(b)) matchedUnique.add(b);
    }

    let totalMatchedRowsA = 0;
    let totalMatchedRowsB = 0;
    for (const b of matchedUnique) {
      totalMatchedRowsA += sumA.batchCounts.get(b) || 0;
      totalMatchedRowsB += sumB.batchCounts.get(b) || 0;
    }

    const uniqueMissingInB = Array.from(sumA.batchSet).filter((b) => !sumB.batchSet.has(b)).length;
    const uniqueMissingInA = Array.from(sumB.batchSet).filter((b) => !sumA.batchSet.has(b)).length;

    const rowResults: RowComparison[] = [];

    for (const r of parsedA.rows) {
      if (!r.batch.trim()) {
        rowResults.push({ file: 'A', row: r.row, batch: '', status: 'empty' });
        continue;
      }
      rowResults.push({
        file: 'A',
        row: r.row,
        batch: r.batch,
        status: sumB.batchSet.has(r.batch) ? 'match' : 'missing_in_other',
      });
    }

    for (const r of parsedB.rows) {
      if (!r.batch.trim()) {
        rowResults.push({ file: 'B', row: r.row, batch: '', status: 'empty' });
        continue;
      }
      rowResults.push({
        file: 'B',
        row: r.row,
        batch: r.batch,
        status: sumA.batchSet.has(r.batch) ? 'match' : 'missing_in_other',
      });
    }

    const result: CompareResult = {
      success: true,
      fileA: {
        fileName: parsedA.fileName,
        totalRows: sumA.totalRows,
        batchHeader: parsedA.batchHeader,
        emptyBatchRows: sumA.emptyBatchRows,
        uniqueBatches: sumA.uniqueBatches,
      },
      fileB: {
        fileName: parsedB.fileName,
        totalRows: sumB.totalRows,
        batchHeader: parsedB.batchHeader,
        emptyBatchRows: sumB.emptyBatchRows,
        uniqueBatches: sumB.uniqueBatches,
      },
      matches: { uniqueMatched: matchedUnique.size, totalMatchedRowsA, totalMatchedRowsB },
      missing: { uniqueMissingInB, uniqueMissingInA },
      duplicates: { duplicatesInA: sumA.duplicates, duplicatesInB: sumB.duplicates },
      rowResults,
      errors,
    };

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Compare batches error:', e);
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
