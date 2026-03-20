import React, { useState, useEffect } from 'react';
import { XCircle, Check, Printer } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

export interface PrintableLabelItem {
  medication_id: string;
  medication_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
}

interface MedicineBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PrintableLabelItem[];
  title?: string;
  subtitle?: string;
}

export default function MedicineBarcodeModal({ 
  isOpen, 
  onClose, 
  items, 
  title = "Select Barcode Labels",
  subtitle
}: MedicineBarcodeModalProps) {
  const [selectedItemIndices, setSelectedItemIndices] = useState<number[]>([]);
  const [labelPrintCounts, setLabelPrintCounts] = useState<Record<number, number>>({});
  const [isPreparingLabels, setIsPreparingLabels] = useState(false);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      setSelectedItemIndices(items.map((_, idx) => idx));
      const initialCounts: Record<number, number> = {};
      items.forEach((_, idx) => {
        initialCounts[idx] = 1;
      });
      setLabelPrintCounts(initialCounts);
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const printSelectedLabels = async () => {
    if (selectedItemIndices.length === 0) {
      alert('Please select at least one item');
      return;
    }

    setIsPreparingLabels(true);

    try {
      const batchDataMap: Record<string, { barcode: string }> = {};
      const uniqueCombos = selectedItemIndices.map(idx => {
        const item = items[idx];
        return { medId: item.medication_id, batch: item.batch_number };
      });

      for (const combo of uniqueCombos) {
        const key = `${combo.medId}_${combo.batch}`;
        if (!batchDataMap[key]) {
          const { data: batchData } = await supabase
            .from('medicine_batches')
            .select('batch_barcode')
            .eq('batch_number', combo.batch)
            .or(`medication_id.eq.${combo.medId},medicine_id.eq.${combo.medId}`)
            .maybeSingle();
            
          batchDataMap[key] = {
            barcode: batchData?.batch_barcode || combo.batch
          };
        }
      }

      const itemsToPrint: { name: string, barcode: string }[] = [];
      selectedItemIndices.forEach(idx => {
        const count = labelPrintCounts[idx] || 1;
        const item = items[idx];
        const info = batchDataMap[`${item.medication_id}_${item.batch_number}`];
        
        const safeMedicineName = (item.medication_name || '').trim() || 'Unknown Medicine';
        const shortMedicineName = safeMedicineName.length > 25 ? safeMedicineName.substring(0, 25) + '...' : safeMedicineName;
        
        for (let c = 0; c < count; c++) {
          itemsToPrint.push({
            name: shortMedicineName,
            barcode: info.barcode
          });
        }
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setIsPreparingLabels(false);
        return;
      }

      let labelsRowsHtml = '';
      for (let i = 0; i < itemsToPrint.length; i += 3) {
        const rowItems = itemsToPrint.slice(i, i + 3);
        labelsRowsHtml += '<div class="label-row">';
        for (const item of rowItems) {
          labelsRowsHtml += `
            <div class="label-item">
              <div class="header">ANNAM HOSPITAL</div>
              <div class="medicine-name">${item.name}</div>
              <div class="barcode-section">
                <svg class="barcode" data-value="${item.barcode}"></svg>
              </div>
            </div>
          `;
        }
        if (rowItems.length < 3) {
          for (let k = 0; k < (3 - rowItems.length); k++) {
            labelsRowsHtml += '<div class="label-item empty"></div>';
          }
        }
        labelsRowsHtml += '</div>';
      }

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @page { size: 105mm 20mm; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { margin: 0; padding: 0; width: 105mm; height: 20mm; }
              .label-row {
                width: 105mm; height: 20mm;
                display: flex;
                page-break-after: always;
                overflow: hidden;
              }
              .label-item {
                width: 35mm; height: 20mm;
                padding: 2.5mm 1.5mm 0.5mm;
                display: flex; flex-direction: column; justify-content: flex-start;
                font-family: Arial, sans-serif; font-size: 7px; line-height: 1;
                border-right: 0.1mm dashed #eee;
              }
              .label-item.empty { visibility: hidden; }
              .header { text-align: center; font-size: 8px; font-weight: bold; margin-bottom: 0.5mm; }
              .medicine-name { text-align: center; font-size: 7.5px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.3mm; line-height: 1.2; }
              .barcode-section { text-align: center; height: 11mm; display: flex; align-items: center; justify-content: center; }
              .barcode { width: 32mm; height: 11mm; }
            </style>
          </head>
          <body>
            ${labelsRowsHtml}
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
            <script>
              window.onload = function() {
                var barcodes = document.querySelectorAll('.barcode');
                barcodes.forEach(function(el) {
                  var val = el.getAttribute('data-value');
                  try {
                     JsBarcode(el, val, {
                        format: "CODE128",
                        displayValue: true,
                        fontSize: 12,
                        margin: 0,
                        height: 25,
                        width: 1.2
                      });
                  } catch(e) { console.error(e); }
                });
                setTimeout(function(){ window.print(); window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
      onClose();
    } catch (err) {
      alert('Error printing labels');
    } finally {
      setIsPreparingLabels(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-blue-100 text-xs">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">{selectedItemIndices.length} items selected</span>
            <button
              onClick={() => setSelectedItemIndices(selectedItemIndices.length === items.length ? [] : items.map((_, i) => i))}
              className="text-sm text-blue-600 hover:text-blue-800 font-bold"
            >
              {selectedItemIndices.length === items.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const isSelected = selectedItemIndices.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedItemIndices(prev => isSelected ? prev.filter(i => i !== idx) : [...prev, idx])}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'border-2 border-gray-300'}`}>
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{item.medication_name}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">Batch: {item.batch_number}</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2 border rounded-lg p-1 bg-white" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] uppercase font-bold text-gray-400 px-1">Copies</span>
                      <input
                        type="number"
                        min="1"
                        value={labelPrintCounts[idx] || 1}
                        onChange={e => setLabelPrintCounts(prev => ({ ...prev, [idx]: parseInt(e.target.value) || 1 }))}
                        className="w-12 text-center font-bold text-blue-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-6 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-bold transition-all">Cancel</button>
          <button
            onClick={printSelectedLabels}
            disabled={selectedItemIndices.length === 0 || isPreparingLabels}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            {isPreparingLabels ? 'Preparing...' : `Print ${selectedItemIndices.length} Labels`}
          </button>
        </div>
      </div>
    </div>
  );
}
