import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '../../../../../src/lib/supabase-admin';
import ExcelJS from 'exceljs';

type PreviewMatch = {
  medicationName: string;
  medicationId: string;
  batchNumber: string;
  batchId: string;
  excelBarcode: string;
  existingLegacyCode: string | null;
};

type PreviewError = {
  sheet: string;
  row: number;
  message: string;
};

function normalizeHeader(v: any): string {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cellToString(value: any): string {
  if (value == null) return '';
  if (typeof value === 'object' && 'text' in (value as any)) return String((value as any).text || '').trim();
  return String(value).trim();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = requireSupabaseAdmin();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer as any);

    const { data: medications, error: medsError } = await supabase
      .from('medications')
      .select('id,name');

    if (medsError) {
      return NextResponse.json({ error: medsError.message || 'Failed to load medications' }, { status: 500 });
    }

    const medIdByName = new Map<string, string>();
    for (const m of medications || []) {
      const name = String((m as any).name || '').toLowerCase().trim();
      if (name) medIdByName.set(name, (m as any).id);
    }

    const errors: PreviewError[] = [];

    let totalExcelRows = 0;
    let matchedRows = 0;
    let medicationNotFound = 0;
    let batchNotFound = 0;
    let missingBarcode = 0;
    let alreadyHasLegacy = 0;

    const sampleMatches: PreviewMatch[] = [];

    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;
      if (worksheet.rowCount < 2) continue;

      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim();
      });

      const colMap: Record<'drugName' | 'batch' | 'barcode', number | undefined> = {
        drugName: undefined,
        batch: undefined,
        barcode: undefined,
      };

      headers.forEach((h, idx) => {
        const norm = normalizeHeader(h);
        if (!norm) return;
        if (norm === 'drugname' || norm === 'medicine' || norm === 'medicinename') colMap.drugName = idx;
        else if (norm === 'batch' || norm === 'batchno' || norm === 'batchnumber') colMap.batch = idx;
        else if (norm === 'barcode' || norm === 'legacycode' || norm === 'legacy') colMap.barcode = idx;
      });

      if (!colMap.drugName || !colMap.batch || !colMap.barcode) {
        errors.push({
          sheet: sheetName,
          row: 0,
          message: 'Missing required columns. Need DrugName (or Medicine), Batch, Barcode',
        });
        continue;
      }

      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);

        const drugNameRaw = cellToString(row.getCell(colMap.drugName).value);
        const batchRaw = cellToString(row.getCell(colMap.batch).value);
        const barcodeRaw = cellToString(row.getCell(colMap.barcode).value);

        if (!drugNameRaw && !batchRaw && !barcodeRaw) continue;

        totalExcelRows++;

        const drugName = drugNameRaw.trim();
        const batchNumber = batchRaw.trim();
        const excelBarcode = barcodeRaw.trim();

        if (!drugName || !batchNumber) {
          errors.push({ sheet: sheetName, row: rowNum, message: 'Missing DrugName or Batch' });
          continue;
        }

        if (!excelBarcode) {
          missingBarcode++;
          continue;
        }

        const medId = medIdByName.get(drugName.toLowerCase().trim());
        if (!medId) {
          medicationNotFound++;
          continue;
        }

        const { data: batchRow, error: batchErr } = await supabase
          .from('medicine_batches')
          .select('id, legacy_code')
          .eq('batch_number', batchNumber)
          .or(`medication_id.eq.${medId},medicine_id.eq.${medId}`)
          .limit(1)
          .maybeSingle();

        if (batchErr) {
          errors.push({ sheet: sheetName, row: rowNum, message: batchErr.message || 'Batch lookup failed' });
          continue;
        }

        if (!batchRow) {
          batchNotFound++;
          continue;
        }

        matchedRows++;
        if (batchRow.legacy_code) alreadyHasLegacy++;

        if (sampleMatches.length < 5) {
          sampleMatches.push({
            medicationName: drugName,
            medicationId: medId,
            batchNumber,
            batchId: (batchRow as any).id,
            excelBarcode,
            existingLegacyCode: (batchRow as any).legacy_code ?? null,
          });
        }
      }
    }

    return NextResponse.json({
      fileName: file.name,
      totalExcelRows,
      matchedRows,
      medicationNotFound,
      batchNotFound,
      missingBarcode,
      alreadyHasLegacy,
      sampleMatches,
      errors,
    });
  } catch (e: any) {
    console.error('Legacy batch code preview error:', e);
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
