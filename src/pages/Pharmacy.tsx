import React, { useState } from 'react';
import { Search, Filter, Plus, AlertTriangle, Package, ArrowUpRight, FileText, MoreVertical, RefreshCw } from 'lucide-react';

const Pharmacy: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  
  // Mock data for inventory
  const inventory = [
    { id: 1, name: 'Lisinopril', category: 'Cardiovascular', stock: 245, unit: 'tablets', reorderPoint: 100, supplier: 'PharmaCorp', lastOrder: '2023-05-01', status: 'In Stock' },
    { id: 2, name: 'Metformin', category: 'Diabetes', stock: 82, unit: 'tablets', reorderPoint: 100, supplier: 'MediSupply', lastOrder: '2023-05-05', status: 'Low Stock' },
    { id: 3, name: 'Amoxicillin', category: 'Antibiotics', stock: 156, unit: 'capsules', reorderPoint: 120, supplier: 'PharmaCorp', lastOrder: '2023-05-03', status: 'In Stock' },
    { id: 4, name: 'Omeprazole', category: 'Gastrointestinal', stock: 45, unit: 'tablets', reorderPoint: 80, supplier: 'MediSupply', lastOrder: '2023-05-07', status: 'Low Stock' },
    { id: 5, name: 'Ibuprofen', category: 'Pain Relief', stock: 312, unit: 'tablets', reorderPoint: 150, supplier: 'PharmaCorp', lastOrder: '2023-04-28', status: 'In Stock' },
    { id: 6, name: 'Sertraline', category: 'Mental Health', stock: 178, unit: 'tablets', reorderPoint: 100, supplier: 'MediSupply', lastOrder: '2023-05-02', status: 'In Stock' },
    { id: 7, name: 'Albuterol', category: 'Respiratory', stock: 34, unit: 'inhalers', reorderPoint: 50, supplier: 'PharmaCorp', lastOrder: '2023-05-06', status: 'Low Stock' },
    { id: 8, name: 'Levothyroxine', category: 'Hormones', stock: 223, unit: 'tablets', reorderPoint: 120, supplier: 'MediSupply', lastOrder: '2023-04-30', status: 'In Stock' }
  ];

  // Mock data for pending orders
  const pendingOrders = [
    { id: 'RX001', patient: 'James Wilson', medication: 'Lisinopril 10mg', quantity: '30 tablets', doctor: 'Dr. Robert Chen', status: 'Ready', time: '10:30 AM' },
    { id: 'RX002', patient: 'Sarah Johnson', medication: 'Metformin 500mg', quantity: '60 tablets', doctor: 'Dr. Lisa Wong', status: 'Processing', time: '11:15 AM' },
    { id: 'RX003', patient: 'Michael Rodriguez', medication: 'Amoxicillin 500mg', quantity: '21 capsules', doctor: 'Dr. Robert Chen', status: 'Pending', time: '11:45 AM' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-gray-900">Pharmacy Management</h1>
        <p className="text-gray-500 mt-1">Manage medication inventory and prescriptions</p>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Total Medications</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">1,284</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Package className="text-orange-400" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm text-green-500">
            <RefreshCw size={16} className="mr-1" />
            Last updated 5 mins ago
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Low Stock Items</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">12</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm text-red-500">
            <ArrowUpRight size={16} className="mr-1" />
            3 items need immediate reorder
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Pending Orders</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">8</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="text-blue-400" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm text-blue-500">
            <ArrowUpRight size={16} className="mr-1" />
            2 new orders in last hour
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Completed Today</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">45</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Package className="text-green-400" size={20} />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm text-green-500">
            <ArrowUpRight size={16} className="mr-1" />
            12 more than yesterday
          </div>
        </div>
      </div>
      
      {/* Inventory Management */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-gray-900">Inventory Management</h2>
          <div className="flex space-x-3">
            <button className="btn-secondary flex items-center">
              <Filter size={18} className="mr-2" />
              Filter
            </button>
            <button className="btn-primary flex items-center">
              <Plus size={18} className="mr-2" />
              Add Item
            </button>
          </div>
        </div>
        
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Search inventory..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 text-left text-gray-500 text-sm">
              <tr>
                <th className="py-4 px-6 font-medium">Medication Name</th>
                <th className="py-4 px-6 font-medium">Category</th>
                <th className="py-4 px-6 font-medium">Stock</th>
                <th className="py-4 px-6 font-medium">Unit</th>
                <th className="py-4 px-6 font-medium">Reorder Point</th>
                <th className="py-4 px-6 font-medium">Supplier</th>
                <th className="py-4 px-6 font-medium">Last Order</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50">
                  <td className="py-4 px-6 font-medium text-gray-900">{item.name}</td>
                  <td className="py-4 px-6 text-gray-600">{item.category}</td>
                  <td className="py-4 px-6 text-gray-900">{item.stock}</td>
                  <td className="py-4 px-6 text-gray-600">{item.unit}</td>
                  <td className="py-4 px-6 text-gray-600">{item.reorderPoint}</td>
                  <td className="py-4 px-6 text-gray-600">{item.supplier}</td>
                  <td className="py-4 px-6 text-gray-600">{item.lastOrder}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'In Stock' ? 'bg-green-50 text-green-500' :
                      item.status === 'Low Stock' ? 'bg-orange-50 text-orange-500' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pending Orders */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-gray-900">Pending Orders</h2>
          <button className="text-orange-400 hover:text-orange-500 text-sm font-medium flex items-center">
            View All <ArrowUpRight size={16} className="ml-1" />
          </button>
        </div>
        
        <div className="space-y-4">
          {pendingOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                  {order.id}
                </div>
                <div className="ml-4">
                  <h3 className="font-medium text-gray-900">{order.patient}</h3>
                  <p className="text-sm text-gray-500">{order.medication}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="text-right mr-6">
                  <p className="text-sm text-gray-900">{order.doctor}</p>
                  <p className="text-xs text-gray-500">{order.time}</p>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  order.status === 'Ready' ? 'bg-green-50 text-green-500' :
                  order.status === 'Processing' ? 'bg-blue-50 text-blue-500' :
                  'bg-orange-50 text-orange-500'
                }`}>
                  {order.status}
                </span>
                
                <button 
                  className="ml-4 btn-primary text-sm"
                  onClick={() => setShowDispenseModal(true)}
                >
                  Dispense
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Dispense Modal */}
      {showDispenseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDispenseModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Dispense Medication</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-500" 
                    onClick={() => setShowDispenseModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order ID</label>
                    <p className="mt-1 text-gray-900">RX001</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Patient</label>
                    <p className="mt-1 text-gray-900">James Wilson</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medication</label>
                    <p className="mt-1 text-gray-900">Lisinopril 10mg</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <p className="mt-1 text-gray-900">30 tablets</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Instructions</label>
                    <p className="mt-1 text-gray-900">Take one tablet daily with water</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prescribing Doctor</label>
                    <p className="mt-1 text-gray-900">Dr. Robert Chen</p>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Pharmacist Notes</label>
                    <textarea 
                      className="mt-1 input-field h-24"
                      placeholder="Add any notes about the dispensation..."
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowDispenseModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowDispenseModal(false)}
                >
                  Confirm & Dispense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pharmacy;