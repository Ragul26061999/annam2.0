'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  IndianRupee,
  Calendar,
  User,
  Pill,
  FileText,
  BarChart3
} from 'lucide-react';
import { 
  getMedications, 
  getLowStockMedications, 
  addStock, 
  adjustStock, 
  getStockTransactions,
  dispensePrescription,
  createPharmacyBill,
  getPharmacyBills,
  getPharmacyDashboardStats,
  getPendingPrescriptions,
  type Medication,
  type StockTransaction,
  type PharmacyBilling,
  type PendingPrescription
} from '../lib/pharmacyService';
import PharmacyBillingForm from './PharmacyBillingForm';

interface PharmacyManagementProps {
  userId: string;
  userRole: string;
}

const PharmacyManagement: React.FC<PharmacyManagementProps> = ({ userId, userRole }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'billing' | 'dispensing' | 'prescriptions'>('dashboard');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lowStockMedications, setLowStockMedications] = useState<Medication[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [pharmacyBills, setPharmacyBills] = useState<PharmacyBilling[]>([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<PendingPrescription[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showNewBillingForm, setShowNewBillingForm] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  // Form states
  const [stockForm, setStockForm] = useState({
    quantity: 0,
    unit_cost: 0,
    supplier: '',
    batch_number: '',
    expiry_date: '',
    notes: ''
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    reason: '',
    notes: ''
  });

  const [billingForm, setBillingForm] = useState({
    patient_id: '',
    items: [{ medication_id: '', quantity: 1, unit_price: 0 }],
    discount: 0,
    tax_rate: 0,
    payment_method: 'cash'
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventoryData();
    } else if (activeTab === 'billing') {
      loadBillingData();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsResult, lowStockResult] = await Promise.all([
        getPharmacyDashboardStats(),
        getLowStockMedications()
      ]);

      setDashboardStats(statsResult);
      setLowStockMedications(lowStockResult);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [medicationsResult, transactionsResult] = await Promise.all([
        getMedications({ search: searchTerm, category: selectedCategory }),
        getStockTransactions()
      ]);

      setMedications(medicationsResult);
      setStockTransactions(transactionsResult);
    } catch (err) {
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const result = await getPharmacyBills();
      setPharmacyBills(result);
    } catch (err) {
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptionsData = async () => {
    setLoading(true);
    try {
      const result = await getPendingPrescriptions();
      setPendingPrescriptions(result);
    } catch (err) {
      setError('Failed to load prescriptions data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!selectedMedication) return;

    try {
      const result = await addStock(
        selectedMedication.id,
        stockForm.quantity,
        stockForm.unit_cost,
        stockForm.supplier,
        stockForm.batch_number,
        stockForm.expiry_date,
        stockForm.notes,
        userId
      );

      setShowAddStockModal(false);
      setStockForm({
        quantity: 0,
        unit_cost: 0,
        supplier: '',
        batch_number: '',
        expiry_date: '',
        notes: ''
      });
      loadInventoryData();
    } catch (err) {
      setError('Failed to add stock');
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedMedication) return;

    try {
      const result = await adjustStock(
        selectedMedication.id,
        adjustForm.quantity,
        adjustForm.reason,
        adjustForm.notes,
        userId
      );

      setShowAdjustStockModal(false);
      setAdjustForm({
        quantity: 0,
        reason: '',
        notes: ''
      });
      loadInventoryData();
    } catch (err) {
      setError('Failed to adjust stock');
    }
  };

  const handleCreateBill = async () => {
    try {
      const result = await createPharmacyBill(
        billingForm.patient_id,
        billingForm.items,
        billingForm.discount,
        billingForm.tax_rate,
        billingForm.payment_method,
        userId
      );

      setShowBillingModal(false);
      setBillingForm({
        patient_id: '',
        items: [{ medication_id: '', quantity: 1, unit_price: 0 }],
        discount: 0,
        tax_rate: 0,
        payment_method: 'cash'
      });
      loadBillingData();
    } catch (err) {
      setError('Failed to create bill');
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Medications</p>
              <p className="text-2xl font-semibold text-gray-900">
                {dashboardStats?.totalMedications || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {dashboardStats?.lowStockCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <IndianRupee className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{dashboardStats?.todaySales || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Prescriptions Dispensed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {dashboardStats?.prescriptionsDispensed || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockMedications.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Low Stock Medications
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {lowStockMedications.map((medication) => (
                <div key={medication.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{medication.name}</p>
                    <p className="text-sm text-gray-600">
                      Current Stock: {medication.available_stock} | Minimum: {medication.minimum_stock_level}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMedication(medication);
                      setShowAddStockModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Stock
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Billing Form Modal */}
      {showNewBillingForm && (
        <PharmacyBillingForm
          onClose={() => setShowNewBillingForm(false)}
          onBillCreated={() => {
            setShowNewBillingForm(false);
            loadBillingData();
          }}
          currentUser={{ id: userId }}
          billingType="custom"
        />
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search medications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="cardiovascular">Cardiovascular</option>
            <option value="diabetes">Diabetes</option>
            <option value="antibiotics">Antibiotics</option>
            <option value="pain_relief">Pain Relief</option>
            <option value="respiratory">Respiratory</option>
          </select>
          <button
            onClick={loadInventoryData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Medications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Medication Inventory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medication
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {medications.map((medication) => (
                <tr key={medication.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{medication.name}</div>
                      <div className="text-sm text-gray-500">{medication.generic_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {medication.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{medication.available_stock}</div>
                    <div className="text-sm text-gray-500">Min: {medication.minimum_stock_level}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{medication.selling_price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      medication.available_stock <= medication.minimum_stock_level
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {medication.available_stock <= medication.minimum_stock_level ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMedication(medication);
                          setShowAddStockModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMedication(medication);
                          setShowAdjustStockModal(true);
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPrescriptions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pending Prescriptions</h2>
        <button
          onClick={loadPrescriptionsData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Prescriptions Awaiting Dispensing</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prescription ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingPrescriptions.map((prescription) => (
                <tr key={prescription.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {prescription.prescription_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prescription.patient_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prescription.doctor_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(prescription.issue_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      prescription.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : prescription.status === 'partial'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {prescription.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // View prescription details
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Dispense prescription
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Dispense"
                      >
                        <Pill className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pendingPrescriptions.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Pending Prescriptions</h3>
            <p className="mt-1 text-sm text-gray-500">All prescriptions have been dispensed.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pharmacy Billing</h2>
        <button
          onClick={() => setShowNewBillingForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Bill
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Bills</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pharmacyBills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bill.bill_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.patient_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{bill.total_amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.payment_method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pharmacy Management</h1>
          <p className="mt-2 text-gray-600">Manage medications, inventory, and billing</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'inventory', label: 'Inventory', icon: Package },
              { id: 'billing', label: 'Billing', icon: IndianRupee },
              { id: 'dispensing', label: 'Dispensing', icon: Pill },
              { id: 'prescriptions', label: 'Prescriptions', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'billing' && renderBilling()}
            {activeTab === 'dispensing' && (
              <div className="text-center py-12">
                <Pill className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Dispensing Module</h3>
                <p className="mt-1 text-sm text-gray-500">Coming soon...</p>
              </div>
            )}
            {activeTab === 'prescriptions' && renderPrescriptions()}
          </>
        )}
      </div>

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Stock - {selectedMedication?.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({...stockForm, quantity: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockForm.unit_cost}
                    onChange={(e) => setStockForm({...stockForm, unit_cost: parseFloat(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    value={stockForm.supplier}
                    onChange={(e) => setStockForm({...stockForm, supplier: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <input
                    type="text"
                    value={stockForm.batch_number}
                    onChange={(e) => setStockForm({...stockForm, batch_number: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    value={stockForm.expiry_date}
                    onChange={(e) => setStockForm({...stockForm, expiry_date: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStock}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustStockModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adjust Stock - {selectedMedication?.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Stock: {selectedMedication?.available_stock}
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adjustment Quantity</label>
                  <input
                    type="number"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({...adjustForm, quantity: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Use negative numbers to reduce stock"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <select
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select reason</option>
                    <option value="damaged">Damaged</option>
                    <option value="expired">Expired</option>
                    <option value="lost">Lost</option>
                    <option value="returned">Returned</option>
                    <option value="correction">Stock Correction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({...adjustForm, notes: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAdjustStockModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustStock}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyManagement;
