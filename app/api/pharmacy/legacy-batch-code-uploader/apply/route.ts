import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '../../../../../src/lib/supabase-admin';
import ExcelJS from 'exceljs';

type ApplyRowResult = {
  row: number;
  medicationName: string;
  batchNumber: string;
  excelBarcode: string;
  status: 'updated' | 'skipped' | 'not_found' | 'invalid' | 'error';
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
    const overwrite = String(formData.get('overwrite') || 'false') === 'true';

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

    let totalExcelRows = 0;
    let matchedRows = 0;
    let updatedRows = 0;
    let skippedRows = 0;
    let notFoundRows = 0;
    let invalidRows = 0;
    let errorRows = 0;

    const results: ApplyRowResult[] = [];

    for (const worksheet of workbook.worksheets) {
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
        results.push({
          row: 0,
          medicationName: '',
          batchNumber: '',
          excelBarcode: '',
          status: 'invalid',
          message: 'Missing required columns. Need DrugName (or Medicine), Batch, Barcode',
        });
        invalidRows++;
        continue;
      }

      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);

        const drugNameRaw = cellToString(row.getCell(colMap.drugName).value);
        const batchRaw = cellToString(row.getCell(colMap.batch).value);
        const barcodeRaw = cellToString(row.getCell(colMap.barcode).value);

        if (!drugNameRaw && !batchRaw && !barcodeRaw) continue;

        totalExcelRows++;

        const medicationName = drugNameRaw.trim();
        const batchNumber = batchRaw.trim();
        const excelBarcode = barcodeRaw.trim();

        if (!medicationName || !batchNumber || !excelBarcode) {
          results.push({
            row: rowNum,
            medicationName,
            batchNumber,
            excelBarcode,
            status: 'invalid',
            message: 'Missing DrugName, Batch, or Barcode',
          });
          invalidRows++;
          continue;
        }

        const medId = medIdByName.get(medicationName.toLowerCase().trim());
        if (!medId) {
          results.push({
            row: rowNum,
            medicationName,
            batchNumber,
            excelBarcode,
            status: 'not_found',
            message: 'Medication not found',
          });
          notFoundRows++;
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
          results.push({
            row: rowNum,
            medicationName,
            batchNumber,
            excelBarcode,
            status: 'error',
            message: batchErr.message || 'Batch lookup failed',
          });
          errorRows++;
          continue;
        }

        if (!batchRow) {
          results.push({
            row: rowNum,
            medicationName,
            batchNumber,
            excelBarcode,
            status: 'not_found',
            message: 'Batch not found for medication',
          });
          notFoundRows++;
          continue;
        }

        matchedRows++;

        if (!overwrite && (batchRow as any).legacy_code) {
          results.push({
            row: rowNum,
            medicationName,
            batchNumber,
            excelBarcode,
            status: 'skipped',
            message: 'Already has legacy_code (skipped)',
          });
          skippedRows++;
          continue;
        }

        const { error: updErr } = await supabase
          .from('medicine_batches')
          .update({ legacy_code: excelBarcode, updated_at: new Date().toISOString() })
          .eq('id', (batchRow as any).id);

        if (updErr) {
          results.push({
            row: rowNum,
            medicationName,
            batchNumber,
            excelBarcode,
            status: 'error',
            message: updErr.message || 'Update failed',
          });
          errorRows++;
          continue;
        }

        updatedRows++;
        results.push({
          row: rowNum,
          medicationName,
          batchNumber,
          excelBarcode,
          status: 'updated',
          message: 'legacy_code updated',
        });
      }
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      overwrite,
      totalExcelRows,
      matchedRows,
      updatedRows,
      skippedRows,
      notFoundRows,
      invalidRows,
      errorRows,
      results: results.slice(0, 50),
      allResults: results,
    });
  } catch (e: any) {
    console.error('Legacy batch code apply error:', e);
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
