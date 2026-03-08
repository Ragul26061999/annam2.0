'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Eye, Printer, XCircle, FileText, Download, ArrowLeft, Trash2, Edit, Barcode, AlertTriangle, CheckSquare, Square, Check
} from 'lucide-react'
import { supabase } from '@/src/lib/supabase'
import {
  getDrugPurchases,
  getDrugPurchaseById,
  deleteDrugPurchase,
  DrugPurchase,
  DrugPurchaseItem
} from '@/src/lib/enhancedPharmacyService'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'received':
      return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Received</span>
    case 'verified':
      return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Verified</span>
    case 'draft':
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Draft</span>
    case 'cancelled':
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Cancelled</span>
    default:
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">{status}</span>
  }
}

export default function DrugPurchasePage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<DrugPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPurchase, setSelectedPurchase] = useState<DrugPurchase | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const handleEditPurchase = (purchaseId: string) => {
    router.push(`/pharmacy/purchase/new1?purchaseId=${encodeURIComponent(purchaseId)}`)
  }
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedPurchase, setEditedPurchase] = useState<DrugPurchase | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<DrugPurchase | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Label Selection Modal states
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelModalPurchase, setLabelModalPurchase] = useState<DrugPurchase | null>(null)
  const [labelModalItems, setLabelModalItems] = useState<DrugPurchaseItem[]>([])
  const [selectedItemIndices, setSelectedItemIndices] = useState<number[]>([])
  const [isPreparingLabels, setIsPreparingLabels] = useState(false)

  useEffect(() => {
    loadData()
  }, [filterStatus])

  const loadData = async () => {
    setLoading(true)
    try {
      const purchasesData = await getDrugPurchases({ status: filterStatus || undefined })
      setPurchases(purchasesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewPurchase = async (id: string) => {
    setLoadingDetails(true)
    try {
      const purchase = await getDrugPurchaseById(id)
      if (purchase) {
        setSelectedPurchase(purchase)
        setEditedPurchase(JSON.parse(JSON.stringify(purchase))) // Deep copy for editing
        setIsEditMode(false)
      }
    } catch (error) {
      console.error('Error fetching purchase details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleEditToggle = () => {
    if (!isEditMode) {
      setIsEditMode(true)
    } else {
      // Cancel edit mode - restore original data
      if (selectedPurchase) {
        setEditedPurchase(JSON.parse(JSON.stringify(selectedPurchase)))
      }
      setIsEditMode(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!editedPurchase) return

    try {
      // TODO: Call API to update purchase
      console.log('Saving changes:', editedPurchase)

      // For now, just update local state
      setSelectedPurchase(JSON.parse(JSON.stringify(editedPurchase)))
      setIsEditMode(false)

      alert('Purchase updated successfully!')
    } catch (error) {
      console.error('Error saving purchase:', error)
      alert('Error saving purchase: ' + (error as Error).message)
    }
  }

  const handleItemChange = (itemIndex: number, field: string, value: any) => {
    if (!editedPurchase || !editedPurchase.items) return

    const updatedItems = [...editedPurchase.items]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: value
    }

    setEditedPurchase({
      ...editedPurchase,
      items: updatedItems
    })
  }

  const handleHeaderChange = (field: string, value: any) => {
    if (!editedPurchase) return

    setEditedPurchase({
      ...editedPurchase,
      [field]: value
    })
  }

  const handleViewDocument = (documentUrl: string) => {
    setSelectedDocumentUrl(documentUrl)
    setShowDocumentModal(true)
  }

  const handleCloseDocumentModal = () => {
    setSelectedDocumentUrl(null)
    setShowDocumentModal(false)
  }

  const handleDeletePurchase = (purchase: DrugPurchase) => {
    setPurchaseToDelete(purchase)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!purchaseToDelete) return

    console.log('Starting delete for purchase:', purchaseToDelete.id, purchaseToDelete.purchase_number)
    setIsDeleting(true)

    try {
      console.log('Calling deleteDrugPurchase...')
      await deleteDrugPurchase(purchaseToDelete.id)
      console.log('Delete successful, refreshing data...')
      await loadData() // Refresh the list
      setShowDeleteConfirm(false)
      setPurchaseToDelete(null)
      alert('Purchase bill cancelled successfully!')
    } catch (error) {
      console.error('Error deleting purchase:', error)
      alert('Error cancelling purchase: ' + (error as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setPurchaseToDelete(null)
  }

  const printStandardLabel = async (item: DrugPurchaseItem) => {
    try {
      // Fetch the actual batch barcode from medicine_batches table
      const { data: batchData } = await supabase
        .from('medicine_batches')
        .select('batch_barcode, expiry_date')
        .eq('batch_number', item.batch_number)
        .eq('medicine_id', item.medication_id)
        .maybeSingle()

      const barcode = batchData?.batch_barcode || item.batch_number

      const quantity = item.quantity
      const safeMedicineName = (item.medication_name || '').trim() || 'Unknown Medicine'
      const shortMedicineName = safeMedicineName.length > 25
        ? safeMedicineName.substring(0, 25) + '...'
        : safeMedicineName

      const expiryDate = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB') : (batchData?.expiry_date ? new Date(batchData.expiry_date).toLocaleDateString('en-GB') : 'N/A')
      const printDate = new Date().toLocaleDateString('en-GB')

      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const labelContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Standard Medicine Label</title>
            <style>
              @page { size: 35mm 20mm; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', sans-serif;
                width: 35mm; height: 20mm;
                display: flex; flex-direction: column; justify-content: space-between;
                padding: 1mm 1.5mm; font-size: 7px; line-height: 1; background: white;
              }
              .header { text-align: center; font-size: 8px; font-weight: bold; margin-bottom: 0.5mm; }
              .medicine-name { text-align: center; font-size: 8px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.5mm; }
              .batch-info { display: flex; justify-content: space-between; font-size: 6px; font-weight: bold; margin-bottom: 0.5mm; }
              .barcode-section { text-align: center; height: 8mm; display: flex; align-items: center; justify-content: center; }
              #barcode { width: 30mm; height: 8mm; display: block; }
              .footer { display: flex; justify-content: space-between; align-items: center; font-size: 5.5px; margin-top: 0.5mm; }
            </style>
          </head>
          <body>
            <div class="header">ANNAM HOSPITAL</div>
            <div class="medicine-name">${shortMedicineName}</div>
            <div class="batch-info">
              <span>B: ${item.batch_number}</span>
              <span>Q: ${quantity}</span>
            </div>
            <div class="barcode-section"><svg id="barcode"></svg></div>
            <div class="footer">
              <span>E: ${expiryDate}</span>
              <span>P: ${printDate}</span>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
            <script>
              (function() {
                try {
                  var value = ${JSON.stringify(barcode)};
                    JsBarcode('#barcode', value, {
                      format: "CODE128", 
                      displayValue: true, 
                      fontSize: 8, 
                      margin: 0, 
                      height: 25,
                      width: 1.2
                    });
                  setTimeout(function(){ window.print(); window.close(); }, 200);
                } catch (e) {
                  setTimeout(function(){ window.print(); window.close(); }, 200);
                }
              })();
            </script>
          </body>
        </html>
      `
      printWindow.document.write(labelContent)
      printWindow.document.close()
    } catch (err) {
      alert('Failed to print label')
    }
  }

  const printAllLabels = async (purchase: DrugPurchase) => {
    setIsPreparingLabels(true)
    let items = purchase.items;

    // If items are missing (common in list view), fetch them
    if (!items || items.length === 0) {
      try {
        const fullPurchase = await getDrugPurchaseById(purchase.id);
        items = fullPurchase?.items || [];
      } catch (err) {
        console.error('Error fetching purchase items:', err);
        alert('Failed to load purchase items for printing');
        setIsPreparingLabels(false)
        return;
      }
    }

    if (!items || items.length === 0) {
      alert('No items found in this purchase to print labels for');
      setIsPreparingLabels(false)
      return;
    }

    setLabelModalPurchase(purchase)
    setLabelModalItems(items)
    // Select all by default
    setSelectedItemIndices(items.map((_, idx) => idx))
    setShowLabelModal(true)
    setIsPreparingLabels(false)
  }

  const printSelectedLabels = async () => {
    if (selectedItemIndices.length === 0) {
      alert('Please select at least one item');
      return;
    }

    const itemsToPrint = selectedItemIndices.map(idx => labelModalItems[idx]);

    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      let labelsRowsHtml = ''
      
      // Group items into rows of 3
      for (let i = 0; i < itemsToPrint.length; i += 3) {
        const rowItems = itemsToPrint.slice(i, i + 3);
        labelsRowsHtml += '<div class="label-row">';
        
        for (const item of rowItems) {
          const { data: batchData } = await supabase
            .from('medicine_batches')
            .select('batch_barcode, expiry_date')
            .eq('batch_number', item.batch_number)
            .eq('medicine_id', item.medication_id)
            .maybeSingle()

          const barcode = batchData?.batch_barcode || item.batch_number
          const safeMedicineName = (item.medication_name || '').trim() || 'Unknown Medicine'
          const shortMedicineName = safeMedicineName.length > 25 ? safeMedicineName.substring(0, 25) + '...' : safeMedicineName
          const expiryDate = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB') : (batchData?.expiry_date ? new Date(batchData.expiry_date).toLocaleDateString('en-GB') : 'N/A')

          labelsRowsHtml += `
            <div class="label-item">
              <div class="header">ANNAM HOSPITAL</div>
              <div class="medicine-name">${shortMedicineName}</div>
              <div class="batch-info">
                <span>B: ${item.batch_number}</span>
                <span>Q: ${item.quantity}</span>
              </div>
              <div class="barcode-section">
                <svg class="barcode" data-value="${barcode}"></svg>
              </div>
              <div class="footer">
                <span>E: ${expiryDate}</span>
                <span>P: ${new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          `
        }
        
        // Fill empty spots for the last row if needed
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
                padding: 1mm 1.5mm;
                display: flex; flex-direction: column; justify-content: space-between;
                font-family: Arial, sans-serif; font-size: 7px; line-height: 1;
                border-right: 0.1mm dashed #eee;
              }
              .label-item.empty { visibility: hidden; }
              .header { text-align: center; font-size: 8px; font-weight: bold; margin-bottom: 0.5mm; }
              .medicine-name { text-align: center; font-size: 8px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.5mm; }
              .batch-info { display: flex; justify-content: space-between; font-size: 6px; font-weight: bold; margin-bottom: 0.5mm; }
              .barcode-section { text-align: center; height: 8mm; display: flex; align-items: center; justify-content: center; }
              .barcode { width: 30mm; height: 8mm; }
              .footer { display: flex; justify-content: space-between; font-size: 5.5px; margin-top: 0.5mm; }
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
                        fontSize: 8,
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
      `
      printWindow.document.write(content)
      printWindow.document.close()
      setShowLabelModal(false)
    } catch (err) {
      alert('Error printing labels')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-[1800px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drug Purchase</h1>
            <p className="text-gray-600">Manage drug purchases and GRN entries</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/pharmacy/purchase/new1')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Purchase
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by purchase number or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="received">Received</option>
            <option value="verified">Verified</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchases.filter(p =>
              !searchTerm ||
              p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {purchase.purchase_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(purchase.supplier as any)?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {purchase.invoice_number || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(purchase.purchase_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(purchase.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${purchase.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                    {purchase.payment_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(purchase.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewPurchase(purchase.id)}
                      className="text-blue-600 hover:text-blue-800"
                      disabled={loadingDetails}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditPurchase(purchase.id)}
                      className="text-indigo-600 hover:text-indigo-800"
                      disabled={purchase.status === 'cancelled'}
                      title={purchase.status === 'cancelled' ? 'Cannot edit cancelled purchase' : 'Edit purchase'}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => !isPreparingLabels && printAllLabels(purchase)}
                      className={`text-green-600 hover:text-green-800 ${isPreparingLabels ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Select and Print Barcode Labels"
                    >
                      {isPreparingLabels ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div> : <Barcode className="w-4 h-4" />}
                    </button>
                    <button className="text-gray-600 hover:text-gray-800" title="Print Purchase Bill">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePurchase(purchase)}
                      className="text-red-600 hover:text-red-800"
                      disabled={purchase.status === 'cancelled'}
                      title={purchase.status === 'cancelled' ? 'Already cancelled' : 'Cancel purchase'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No purchases found. Click "New Purchase" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold">
                Purchase Details: {selectedPurchase.purchase_number}
                {isEditMode && <span className="text-sm text-blue-600 ml-2">(Edit Mode)</span>}
              </h2>
              <div className="flex gap-2">
                {selectedPurchase && (
                  <button
                    onClick={handleEditToggle}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${isEditMode
                      ? 'bg-gray-500 text-white hover:bg-gray-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {isEditMode ? 'Cancel Edit' : 'Edit'}
                  </button>
                )}
                {!isEditMode && selectedPurchase && (
                  <button
                    onClick={() => handleEditPurchase(selectedPurchase.id)}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                    disabled={selectedPurchase.status === 'cancelled'}
                    title={selectedPurchase.status === 'cancelled' ? 'Cannot edit cancelled purchase' : 'Open in enhanced edit screen'}
                  >
                    <Edit className="w-4 h-4" />
                    Edit in Form
                  </button>
                )}
                {isEditMode && (
                  <button
                    onClick={handleSaveChanges}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Save Changes
                  </button>
                )}
                <button onClick={() => setSelectedPurchase(null)} className="text-gray-500 hover:text-gray-700">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Supplier</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={(editedPurchase?.supplier as any)?.name || ''}
                      onChange={(e) => handleHeaderChange('supplier', {
                        ...(editedPurchase?.supplier as any),
                        name: e.target.value
                      })}
                      className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <>
                      <p className="font-medium text-gray-900">{(selectedPurchase?.supplier as any)?.name}</p>
                      <p className="text-xs text-gray-500">{(selectedPurchase?.supplier as any)?.supplier_code}</p>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Invoice Info</p>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedPurchase?.invoice_number || ''}
                        onChange={(e) => handleHeaderChange('invoice_number', e.target.value)}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Invoice Number"
                      />
                      <input
                        type="date"
                        value={editedPurchase?.purchase_date || ''}
                        onChange={(e) => handleHeaderChange('purchase_date', e.target.value)}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900">{selectedPurchase?.invoice_number || '-'}</p>
                      <p className="text-xs text-gray-500">{formatDate(selectedPurchase?.purchase_date || '')}</p>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payment</p>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <select
                        value={editedPurchase?.payment_mode || 'CREDIT'}
                        onChange={(e) => handleHeaderChange('payment_mode', e.target.value)}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="CREDIT">Credit</option>
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Online</option>
                      </select>
                      <select
                        value={editedPurchase?.payment_status || 'pending'}
                        onChange={(e) => handleHeaderChange('payment_status', e.target.value)}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900 capitalize">{selectedPurchase?.payment_mode || '-'}</p>
                      <p className="text-xs text-gray-500 capitalize">{selectedPurchase?.payment_status || '-'}</p>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={editedPurchase?.total_amount || 0}
                        onChange={(e) => handleHeaderChange('total_amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                      />
                      <input
                        type="number"
                        value={editedPurchase?.total_gst || 0}
                        onChange={(e) => handleHeaderChange('total_gst', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        placeholder="GST Amount"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-lg text-blue-600">{formatCurrency(selectedPurchase?.total_amount || 0)}</p>
                      <p className="text-xs text-gray-500">GST: {formatCurrency(selectedPurchase?.total_gst || 0)}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Document Section */}
              {selectedPurchase.document_url && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Purchase Document</p>
                        <p className="text-xs text-gray-600">Click to view the uploaded purchase document</p>
                      </div>
                    </div>
                    <button
                      onClick={() => selectedPurchase.document_url && handleViewDocument(selectedPurchase.document_url)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                      disabled={!selectedPurchase.document_url}
                    >
                      <Eye className="w-4 h-4" />
                      View Document
                    </button>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <h3 className="text-lg font-semibold mb-4">Purchase Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Medicine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Expiry</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Returned</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Net Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Pack Count</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Free</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">MRP</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">GST%</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(isEditMode ? editedPurchase : selectedPurchase)?.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={item.medication_name}
                              onChange={(e) => handleItemChange(idx, 'medication_name', e.target.value)}
                              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            item.medication_name
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={item.batch_number}
                              onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            item.batch_number
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {isEditMode ? (
                            <input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            formatDate(item.expiry_date)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                              min="0"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                          {(item as any).returned_quantity || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {(item as any).net_quantity || item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={item.pack_counting || 1}
                              onChange={(e) => handleItemChange(idx, 'pack_counting', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                              min="1"
                            />
                          ) : (
                            item.pack_counting || 1
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={item.free_quantity || 0}
                              onChange={(e) => handleItemChange(idx, 'free_quantity', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                              min="0"
                            />
                          ) : (
                            item.free_quantity || 0
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={item.unit_price || 0}
                              onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            formatCurrency(item.unit_price || 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={item.mrp}
                              onChange={(e) => handleItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            formatCurrency(item.mrp)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={item.gst_percent}
                              onChange={(e) => handleItemChange(idx, 'gst_percent', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            `${item.gst_percent}%`
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {!isEditMode && (
                            <button
                              onClick={() => printStandardLabel(item)}
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                              title="Print Barcode Label"
                            >
                              <Barcode className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={11} className="px-4 py-3 text-right font-medium text-gray-900">Subtotal</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(selectedPurchase.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={11} className="px-4 py-3 text-right font-medium text-gray-900">Total GST</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(selectedPurchase.total_gst)}</td>
                    </tr>
                    <tr>
                      <td colSpan={11} className="px-4 py-3 text-right font-bold text-gray-900">Grand Total</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">{formatCurrency(selectedPurchase.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
              {isEditMode && (
                <button
                  onClick={handleSaveChanges}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium mr-3"
                >
                  Save Changes
                </button>
              )}
              <button
                onClick={() => {
                  if (isEditMode) {
                    handleEditToggle()
                  } else {
                    setSelectedPurchase(null)
                  }
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                {isEditMode ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocumentModal && selectedDocumentUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Purchase Document</h3>
              <button
                onClick={handleCloseDocumentModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {selectedDocumentUrl.includes('.pdf') ? (
                <iframe
                  src={selectedDocumentUrl}
                  className="w-full h-[70vh] rounded-lg"
                  title="Purchase Document"
                />
              ) : (
                <img
                  src={selectedDocumentUrl}
                  alt="Purchase Document"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <a
                  href={selectedDocumentUrl}
                  download="purchase-document"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Document
                </a>
                <button
                  onClick={handleCloseDocumentModal}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && purchaseToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cancel Purchase Bill</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-1">
                Purchase: {purchaseToDelete.purchase_number}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Supplier: {(purchaseToDelete.supplier as any)?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                Amount: {formatCurrency(purchaseToDelete.total_amount)}
              </p>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to cancel this purchase bill? This will mark it as cancelled and the associated medicine batches will have their quantity set to 0, removing them from active inventory.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                No, Keep It
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Label Selection Modal */}
      {showLabelModal && labelModalPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Select Barcode Labels</h2>
                <p className="text-blue-100 text-xs">Purchase: {labelModalPurchase.purchase_number}</p>
              </div>
              <button
                onClick={() => setShowLabelModal(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Close"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-500 font-medium">
                  {selectedItemIndices.length} items selected for printing
                </span>
                <button
                  onClick={() => {
                    if (selectedItemIndices.length === labelModalItems.length) {
                      setSelectedItemIndices([])
                    } else {
                      setSelectedItemIndices(labelModalItems.map((_, i) => i))
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-bold"
                >
                  {selectedItemIndices.length === labelModalItems.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-3">
                {labelModalItems.map((item, idx) => {
                  const isSelected = selectedItemIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedItemIndices(prev => prev.filter(i => i !== idx))
                        } else {
                          setSelectedItemIndices(prev => [...prev, idx])
                        }
                      }}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                    >
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'border-2 border-gray-300'
                        }`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{item.medication_name}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">Batch: {item.batch_number}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                          <span>Exp: {formatDate(item.expiry_date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-6 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={printSelectedLabels}
                disabled={selectedItemIndices.length === 0}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Print {selectedItemIndices.length} Labels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
