'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Scissors,
    ChevronLeft,
    Search,
    User,
    Phone,
    Mail,
    Calendar,
    CreditCard,
    Plus,
    Trash2,
    FileText,
    Upload,
    Clock,
    CheckCircle2,
    AlertCircle,
    Hash,
    Stethoscope,
    ChevronDown,
    X,
    Printer,
    Save,
    Loader2,
    Beaker,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import { SearchableSelect } from '../../../src/components/ui/SearchableSelect';
import {
    getScanTestCatalog,
    createScanTestOrder,
    createScanTestCatalogEntry,
    updateScanTestCatalogEntry,
    deleteScanTestCatalogEntry,
    getDiagnosticGroups,
    getDiagnosticGroupItems,
    updateDiagnosticGroup,
    deleteDiagnosticGroup,
    deleteDiagnosticGroupItemsByGroupId,
    ScanTestCatalog,
    getPatientLegacyScanOrders
} from '../../../src/lib/labXrayService';
import { Edit3, Search as SearchIcon } from 'lucide-react';
import { createScanBill, type PaymentRecord } from '../../../src/lib/universalPaymentService';
import StaffSelect from '../../../src/components/StaffSelect';
import UniversalPaymentModal from '../../../src/components/UniversalPaymentModal';
import { getAllDoctorsSimple } from '../../../src/lib/doctorService';
import { motion, AnimatePresence } from 'framer-motion';
import LabXrayAttachments from '../../../src/components/LabXrayAttachments';

interface TestSelection {
    testId: string;
    testName: string;
    groupName: string;
    amount: number;
}

export default function ScanOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Master Data
    const [scanCatalog, setScanCatalog] = useState<ScanTestCatalog[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [groupLoading, setGroupLoading] = useState(false);
    const [useGroup, setUseGroup] = useState(false);

    // Search States
    const [uhidSearch, setUhidSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchingPatient, setSearchingPatient] = useState(false);
    const [activePatientIndex, setActivePatientIndex] = useState(-1);

    // New Test State
    const [showNewTestModal, setShowNewTestModal] = useState(false);
    const [newTestData, setNewTestData] = useState({
        testName: '',
        groupName: '',
        amount: 0
    });
    const [creatingTest, setCreatingTest] = useState(false);
    const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
    const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [showNewGroupModal, setShowNewGroupModal] = useState(false);
    const [newGroupData, setNewGroupData] = useState<{
        name: string;
        category: string;
        service_types: string[];
        items: any[];
    }>({
        name: '',
        category: 'Scan',
        service_types: ['scan'],
        items: []
    });

    // Patient Details (Auto-filled)
    const [patientDetails, setPatientDetails] = useState({
        id: '',
        uhid: '',
        name: '',
        gender: '',
        age: '',
        contactNo: '',
        emailId: ''
    });

    const [selectedTests, setSelectedTests] = useState<TestSelection[]>([]);
    const [pendingTestId, setPendingTestId] = useState('');
    const [pendingAmount, setPendingAmount] = useState<number>(0);
    const [orderingDoctorId, setOrderingDoctorId] = useState('');
    const [clinicalIndication, setClinicalIndication] = useState('');
    const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat' | 'emergency'>('routine');
    const [totalAmount, setTotalAmount] = useState(0);
    const [staffId, setStaffId] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [generatedBill, setGeneratedBill] = useState<PaymentRecord | null>(null);
    // Patient Existing Orders
    const [patientOrders, setPatientOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!useGroup) return;
        (async () => {
            setGroupLoading(true);
            try {
                const groups = await getDiagnosticGroups({ is_active: true });
                const scanGroups = (groups || []).filter((g: any) => {
                    const serviceTypes: string[] = Array.isArray(g.service_types) ? g.service_types : [];
                    if (serviceTypes.length === 0) {
                        return String(g.category || '').toLowerCase() === 'scan' || String(g.category || '').toLowerCase() === 'mixed';
                    }
                    return serviceTypes.includes('scan');
                });
                setAvailableGroups(scanGroups);
            } catch {
                setAvailableGroups([]);
            } finally {
                setGroupLoading(false);
            }
        })();
    }, [useGroup]);

    useEffect(() => {
        const total = selectedTests.reduce((sum, test) => sum + test.amount, 0);
        setTotalAmount(total);
    }, [selectedTests]);

    // Real-time search with debouncing
    const searchPatients = useCallback(async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        setSearchingPatient(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or(`patient_id.ilike.%${searchTerm.trim()}%,name.ilike.%${searchTerm.trim()}%,phone.ilike.%${searchTerm.trim()}%`)
                .limit(10)
                .order('name');

            if (error) throw error;
            const results = data || [];
            setSearchResults(results);
            setShowSearchDropdown(results.length > 0);
            if (results.length > 0) setActivePatientIndex(0);
            else setActivePatientIndex(-1);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
        } finally {
            setSearchingPatient(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchPatients(uhidSearch);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [uhidSearch, searchPatients]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.search-container')) {
                setShowSearchDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            console.log('Loading initial data for scan page...');
            const [catalog, doctorsList] = await Promise.all([
                getScanTestCatalog(),
                getAllDoctorsSimple()
            ]);
            console.log('Scan catalog loaded:', catalog);
            console.log('Doctors loaded:', doctorsList);
            setScanCatalog((catalog || []).sort((a: any, b: any) => String(b.id).localeCompare(String(a.id))));
            setDoctors(doctorsList || []);
        } catch (err) {
            console.error('Error loading initial data:', err);
            setError('Failed to load catalog data.');
        } finally {
            setLoading(false);
        }
    };

    const handlePatientSelect = async (patient: any) => {
        // Calculate age
        let age = '';
        if (patient.date_of_birth) {
            const birthDate = new Date(patient.date_of_birth);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                years--;
            }
            age = years.toString();
        }

        setPatientDetails({
            id: patient.id,
            uhid: patient.patient_id,
            name: patient.name,
            gender: patient.gender || '',
            age: age,
            contactNo: patient.phone || '',
            emailId: patient.email || ''
        });

        setUhidSearch(patient.name);
        setShowSearchDropdown(false);
        setSearchResults([]);
        setActivePatientIndex(-1);
        setError(null);

        // Load existing scan orders for this patient
        await loadPatientOrders(patient.id);
    };

    const loadPatientOrders = async (patientId: string) => {
        if (!patientId) return;
        setLoadingOrders(true);
        try {
            const orders = await getPatientLegacyScanOrders(patientId);
            // Filter only scheduled and sample_pending orders
            const filteredOrders = orders.filter((order: any) => 
                order.status === 'scheduled' || order.status === 'sample_pending'
            );
            // Enrich orders with catalog data
            const enrichedOrders = await Promise.all(
                filteredOrders.map(async (order: any) => {
                    const { data: catalog } = await supabase
                        .from('scan_test_catalog')
                        .select('*')
                        .eq('id', order.scan_test_catalog_id)
                        .maybeSingle();
                    return { ...order, test_catalog: catalog };
                })
            );
            setPatientOrders(enrichedOrders);
        } catch (err) {
            console.error('Error loading patient orders:', err);
        } finally {
            setLoadingOrders(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ordered': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'patient_arrived': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'scan_completed': return 'bg-teal-100 text-teal-800 border-teal-200';
            case 'report_pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled':
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleUHIDSearch = async () => {
        if (!uhidSearch.trim()) return;

        setSearchingPatient(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or(`patient_id.ilike.%${uhidSearch.trim()}%,name.ilike.%${uhidSearch.trim()}%`)
                .limit(1);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                setError('Patient not found with this UHID or name.');
                return;
            }

            const patient = data[0];
            handlePatientSelect(patient);
        } catch (err: any) {
            console.error('Patient search error:', err);
            setError('An error occurred while searching for the patient.');
        } finally {
            setSearchingPatient(false);
        }
    };

    const handleSaveCatalogEntry = async () => {
        if (!newTestData.testName || !newTestData.groupName) {
            setError('Scan name and modality are required.');
            return;
        }

        try {
            setCreatingTest(true);
            if (editingCatalogId) {
                const updated = await updateScanTestCatalogEntry(editingCatalogId, {
                    scan_name: newTestData.testName,
                    category: newTestData.groupName,
                    test_cost: newTestData.amount
                });
                setScanCatalog(prev => prev.map(t => t.id === editingCatalogId ? updated : t));
            } else {
                const newEntry = await createScanTestCatalogEntry({
                    scan_name: newTestData.testName,
                    category: newTestData.groupName,
                    test_cost: newTestData.amount
                });
                setScanCatalog(prev => [newEntry, ...prev]);
            }

            // Success!
            setNewTestData({ testName: '', groupName: '', amount: 0 });
            setEditingCatalogId(null);
            setShowNewTestModal(false);
        } catch (err: any) {
            console.error('Error saving scan:', err);
            setError(`Failed to ${editingCatalogId ? 'update' : 'create'} scan catalog entry.`);
        } finally {
            setCreatingTest(false);
        }
    };

    const handleEditCatalog = (test: ScanTestCatalog) => {
        setNewTestData({
            testName: test.test_name || test.scan_name || '',
            groupName: test.modality || test.category || '',
            amount: test.test_cost || 0
        });
        setEditingCatalogId(test.id);
    };

    const handleDeleteCatalog = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this scan from the catalog?')) return;
        try {
            await deleteScanTestCatalogEntry(id);
            setScanCatalog(prev => prev.filter(t => t.id !== id));
            if (pendingTestId === id) setPendingTestId('');
        } catch (err: any) {
            setError('Failed to delete catalog entry');
            console.error(err);
        }
    };

    const handleEditGroup = async (group: any) => {
        setEditingGroupId(group.id);
        const groupItems = await getDiagnosticGroupItems(group.id);
        setNewGroupData({
            name: group.name,
            category: group.category || 'Scan',
            service_types: group.service_types || ['scan'],
            items: groupItems.map(it => {
                const test = scanCatalog.find(t => t.id === it.catalog_id);
                return {
                    testId: it.catalog_id,
                    testName: test?.test_name || test?.scan_name || 'Unknown',
                    amount: test?.test_cost || 0
                };
            })
        });
        setShowNewGroupModal(true);
    };

    const handleDeleteGroup = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this group? Cannot be undone.')) return;
        try {
            await deleteDiagnosticGroupItemsByGroupId(id);
            await deleteDiagnosticGroup(id);
            refreshGroups();
            if (selectedGroupId === id) clearGroupSelection();
        } catch (err: any) {
            setError('Failed to delete diagnostic group');
            console.error(err);
        }
    };

    const refreshGroups = async () => {
        if (!useGroup) return;
        setGroupLoading(true);
        try {
            const groups = await getDiagnosticGroups({ is_active: true });
            const scanGroups = (groups || []).filter((g: any) => {
                const serviceTypes: string[] = Array.isArray(g.service_types) ? g.service_types : [];
                if (serviceTypes.length === 0) {
                    return String(g.category || '').toLowerCase() === 'scan' || String(g.category || '').toLowerCase() === 'mixed';
                }
                return serviceTypes.includes('scan');
            });
            setAvailableGroups(scanGroups);
        } catch {
            setAvailableGroups([]);
        } finally {
            setGroupLoading(false);
        }
    };

    const handleSaveGroup = async () => {
        if (!newGroupData.name) {
            setError('Group name is required');
            return;
        }

        try {
            setCreatingTest(true);
            let groupId = editingGroupId;

            if (editingGroupId) {
                await updateDiagnosticGroup(editingGroupId, {
                    name: newGroupData.name,
                    category: newGroupData.category,
                    service_types: newGroupData.service_types as any[]
                });
                await deleteDiagnosticGroupItemsByGroupId(editingGroupId);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: group, error: groupError } = await supabase
                    .from('diagnostic_groups')
                    .insert([{
                        name: newGroupData.name,
                        category: newGroupData.category,
                        service_types: newGroupData.service_types,
                        created_by: user?.id,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (groupError) throw groupError;
                groupId = group.id;
            }

            if (groupId) {
                const itemPromises = newGroupData.items.map((item, index) => {
                    return supabase
                        .from('diagnostic_group_items')
                        .insert([{
                            group_id: groupId,
                            service_type: 'scan',
                            catalog_id: item.testId,
                            sort_order: index,
                            default_selected: true,
                            updated_at: new Date().toISOString()
                        }]);
                });
                await Promise.all(itemPromises);
            }

            setNewGroupData({ name: '', category: 'Scan', service_types: ['scan'], items: [] });
            
            if (editingGroupId === selectedGroupId && groupId) {
                await applyGroupToSelection(groupId);
            }
            
            setEditingGroupId(null);
            refreshGroups();
            setShowNewGroupModal(true); // Wait, should be false
            setShowNewGroupModal(false);

        } catch (e: any) {
            setError(e?.message || 'Failed to save group');
        } finally {
            setCreatingTest(false);
        }
    };

    const handleAddPendingTest = () => {
        if (!pendingTestId) return;
        const test = scanCatalog.find(t => t.id === pendingTestId);
        if (!test) return;
        setSelectedTests(prev => [
            {
                testId: test.id,
                testName: test.test_name || test.scan_name || '',
                groupName: test.modality || test.category || 'N/A',
                amount: Number.isFinite(pendingAmount) && pendingAmount > 0 ? pendingAmount : (test.test_cost || 0)
            },
            ...prev.filter(t => t.testId !== test.id)
        ]);
        // reset pending
        setPendingTestId('');
        setPendingAmount(0);
    };

    const handleRemoveSelectedTest = (testId: string) => {
        setSelectedTests(prev => prev.filter(t => t.testId !== testId));
    };

    // Handle selecting/deselecting an order
    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    // Handle select all orders
    const toggleSelectAllOrders = () => {
        if (selectedOrderIds.size === patientOrders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(patientOrders.map(o => o.id)));
        }
    };

    // Add selected orders to Selected Tests
    const handleBillSelectedOrders = () => {
        const selectedOrders = patientOrders.filter(order => selectedOrderIds.has(order.id));
        
        selectedOrders.forEach(order => {
            const testCatalog = order.test_catalog;
            if (testCatalog) {
                // Check if test is already in selectedTests
                const alreadySelected = selectedTests.some(t => t.testId === testCatalog.id);
                if (!alreadySelected) {
                    setSelectedTests(prev => [
                        ...prev,
                        {
                            testId: testCatalog.id,
                            testName: testCatalog.test_name,
                            groupName: testCatalog.category || 'Scan',
                            bodyPart: '',
                            amount: testCatalog.test_cost || 0
                        }
                    ]);
                }
            }
        });

        // Clear selections after adding
        setSelectedOrderIds(new Set());
    };

    const handleAmountChange = (testId: string, amount: number) => {
        setSelectedTests(prev => prev.map(t => t.testId === testId ? { ...t, amount } : t));
    };

    // Update pending amount automatically when pending test changes
    useEffect(() => {
        if (!pendingTestId) {
            setPendingAmount(0);
            return;
        }
        const t = scanCatalog.find(item => item.id === pendingTestId);
        setPendingAmount(t?.test_cost || 0);
    }, [pendingTestId, scanCatalog]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientDetails.id) {
            setError('Please search and select a patient first.');
            return;
        }
        const filledTests = selectedTests.filter(t => t.testId);
        if (filledTests.length === 0) {
            setError('Please add at least one scan.');
            return;
        }
        // Add validation for ordering doctor since it's required by the database
        if (!orderingDoctorId) {
            setError('Please select an ordering doctor.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Create scan test orders
            const orderPromises = filledTests.map(test =>
                createScanTestOrder({
                    patient_id: patientDetails.id,
                    ordering_doctor_id: orderingDoctorId,
                    test_catalog_id: test.testId,
                    amount: test.amount,
                    clinical_indication: clinicalIndication,
                    urgency: urgency,
                    status: 'ordered'
                })
            );

            const orders = await Promise.all(orderPromises);

            // Create bill for the scan tests
            const bill = await createScanBill(patientDetails.id, orders);
            setGeneratedBill(bill);

            // Show payment modal first
            setShowPaymentModal(true);
            // Don't show success modal yet - wait for payment interaction
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to create orders.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePaymentSuccess = () => {
        // Close payment modal and show success modal
        setShowPaymentModal(false);
        setSuccess(true);
        // Refresh existing orders to remove billed ones
        if (patientDetails.id) {
            loadPatientOrders(patientDetails.id);
        }
    };

    const handlePaymentClose = () => {
        // Even if payment is cancelled/skipped, show success modal because orders were created
        setShowPaymentModal(false);
        setSuccess(true);
    };

    const applyGroupToSelection = async (groupId: string) => {
        if (!groupId) return;
        setGroupLoading(true);
        setError(null);
        try {
            const groupItems = await getDiagnosticGroupItems(groupId);
            const scanItems = (groupItems || []).filter((it: any) => String(it.service_type) === 'scan');
            const selections: TestSelection[] = scanItems
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((it: any) => {
                    const test = scanCatalog.find(t => t.id === it.catalog_id);
                    return {
                        testId: it.catalog_id,
                        testName: test?.test_name || test?.scan_name || '',
                        groupName: test?.modality || test?.category || 'N/A',
                        amount: test?.test_cost || 0
                    };
                })
                .filter(s => Boolean(s.testId));

            setSelectedTests(selections);
        } catch (e: any) {
            setError(e?.message || 'Failed to load group items');
        } finally {
            setGroupLoading(false);
        }
    };

    const clearGroupSelection = () => {
        setSelectedGroupId('');
        setUseGroup(false);
        setSelectedTests([]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Preparing Scan Suite...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6">
            <div className="max-w-[1550px] mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Link 
                            href="/lab-xray" 
                            className="p-4 bg-white border border-slate-200 rounded-[24px] text-slate-400 hover:text-purple-600 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-900/5 transition-all active:scale-90"
                        >
                            <ChevronLeft size={24} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg">Imaging Suite</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scan & MRI Dept</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Diagnostic Scan Order</h1>
                        </div>
                    </div>
                </div>

                {/* Patient Information Section (Rectangular Design) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
                >
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-purple-600 rounded-[22px] text-white shadow-lg shadow-purple-200">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">Patient Information</h2>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Demographics & Identity</p>
                                </div>
                            </div>

                            <div className="w-full md:w-96 search-container">
                                <div className="relative group">
                                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchingPatient ? 'text-purple-500' : 'text-slate-400 group-focus-within:text-purple-500'}`} size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search UHID or Name..."
                                        value={uhidSearch}
                                        onChange={(e) => setUhidSearch(e.target.value)}
                                        onFocus={() => setShowSearchDropdown(searchResults.length > 0)}
                                        onKeyDown={(e) => {
                                            if (showSearchDropdown && searchResults.length > 0) {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setActivePatientIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setActivePatientIndex(prev => (prev > 0 ? prev - 1 : 0));
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (activePatientIndex >= 0 && activePatientIndex < searchResults.length) {
                                                        handlePatientSelect(searchResults[activePatientIndex]);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setShowSearchDropdown(false);
                                                }
                                            }
                                        }}
                                        className="w-full pl-12 pr-12 py-3 bg-white border-2 border-slate-100 focus:border-purple-500 rounded-2xl transition-all outline-none text-sm font-semibold text-slate-700 shadow-sm"
                                    />
                                    {uhidSearch && (
                                        <button
                                            onClick={() => {
                                                setUhidSearch('');
                                                setPatientDetails({ id: '', uhid: '', name: '', gender: '', age: '', contactNo: '', emailId: '' });
                                                setSearchResults([]);
                                                setShowSearchDropdown(false);
                                                setActivePatientIndex(-1);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}

                                    {/* Search Results Dropdown */}
                                    {showSearchDropdown && searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-80 overflow-y-auto z-50">
                                            {searchResults.map((patient, index) => (
                                                <button
                                                    key={patient.id}
                                                    onClick={() => handlePatientSelect(patient)}
                                                    onMouseEnter={() => setActivePatientIndex(index)}
                                                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b border-slate-100 last:border-b-0 ${
                                                        activePatientIndex === index ? 'bg-purple-50' : 'hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                        <User size={16} className="text-purple-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-slate-900 truncate">{patient.name}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">{patient.patient_id}</span>
                                                            <span>{patient.gender}</span>
                                                            {patient.phone && <span>• {patient.phone}</span>}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UHID</label>
                                <div className="text-sm font-bold text-purple-600 truncate">{patientDetails.uhid || '--'}</div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                <div className="text-sm font-bold text-slate-800 truncate">{patientDetails.name || '--'}</div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</label>
                                <div className="text-sm font-bold text-slate-800">{patientDetails.age ? `${patientDetails.age} Yrs` : '--'}</div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                                <div className="text-sm font-bold text-slate-800 capitalize">{patientDetails.gender || '--'}</div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</label>
                                <div className="text-sm font-bold text-slate-800">{patientDetails.contactNo || '--'}</div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                                <div className="text-sm font-bold text-slate-800 truncate">{patientDetails.emailId || '--'}</div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                            <AlertCircle size={18} className="text-amber-500 shrink-0" />
                            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider">
                                NOTE: Verify patient identity before proceeding with imaging diagnostics to ensure clinical accuracy.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Existing Scan Orders for Patient */}
                {patientDetails.id && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-600/20">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">Existing Scan Orders</h2>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        {patientOrders.length} order(s) for this patient
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedOrderIds.size > 0 && (
                                    <button
                                        onClick={handleBillSelectedOrders}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
                                    >
                                        <Plus size={16} />
                                        Bill ({selectedOrderIds.size})
                                    </button>
                                )}
                                <button
                                    onClick={() => loadPatientOrders(patientDetails.id)}
                                    className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
                                    title="Refresh Orders"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {loadingOrders ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                    <span className="ml-2 text-slate-500">Loading orders...</span>
                                </div>
                            ) : patientOrders.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No existing scan orders for this patient</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left">
                                                    <input
                                                        type="checkbox"
                                                        checked={patientOrders.length > 0 && selectedOrderIds.size === patientOrders.length}
                                                        onChange={toggleSelectAllOrders}
                                                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Order #</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Scan Name</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Urgency</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {patientOrders.map((order) => (
                                                <tr key={order.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedOrderIds.has(order.id)}
                                                            onChange={() => toggleOrderSelection(order.id)}
                                                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-mono text-slate-600">
                                                        {order.id.slice(0, 8)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-semibold text-slate-800">
                                                            {order.test_catalog?.scan_name || order.scan_name || 'Unknown Scan'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                                            {order.status?.replace(/_/g, ' ') || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                                            order.urgency === 'stat' ? 'bg-red-100 text-red-700' :
                                                            order.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' :
                                                            order.urgency === 'emergency' ? 'bg-red-200 text-red-800 animate-pulse' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {order.urgency || 'routine'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-500">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Scan Selection Workspace (Split Layout) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Selection Console (4/12) */}
                    <div className="xl:col-span-4 space-y-6 sticky top-6 h-fit">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-[32px] border border-slate-200 shadow-sm"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                                        <Plus size={20} />
                                    </div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Select New Scan</h3>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Group Selector Toggle */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Procurement Mode</label>
                                        <button 
                                            onClick={() => {
                                                setUseGroup(!useGroup);
                                                if (useGroup) setSelectedGroupId('');
                                            }}
                                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${
                                                useGroup ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {useGroup ? 'Using Groups' : 'Individual Scan'}
                                        </button>
                                    </div>
                                    
                                    {useGroup && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedGroupId}
                                                    onChange={async (e) => {
                                                        const id = e.target.value;
                                                        setSelectedGroupId(id);
                                                        await applyGroupToSelection(id);
                                                    }}
                                                    className="min-w-0 flex-1 px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-purple-500 transition-all outline-none"
                                                >
                                                    <option value="">Select Protocol Group...</option>
                                                    {availableGroups.map((g: any) => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingGroupId(null);
                                                            setNewGroupData({ name: '', category: 'Scan', service_types: ['scan'], items: [] });
                                                            setShowNewGroupModal(true);
                                                        }}
                                                        className="p-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
                                                        title="Add Group"
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                    {selectedGroupId && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const group = availableGroups.find(g => g.id === selectedGroupId);
                                                                    if (group) {
                                                                        handleEditGroup(group);
                                                                    }
                                                                }}
                                                                className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                                                title="Edit Selected Group"
                                                            >
                                                                <Edit3 size={18} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteGroup(selectedGroupId)}
                                                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                                                title="Delete Selected Group"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Main Study Search */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scan / Procedure Study</label>
                                        <SearchableSelect
                                            value={pendingTestId}
                                            onChange={(value: string) => {
                                                if (value) {
                                                    const test = scanCatalog.find(t => t.id === value);
                                                    if (test) {
                                                        setSelectedTests(prev => [
                                                            {
                                                                testId: test.id,
                                                                testName: test.test_name || test.scan_name || '',
                                                                groupName: test.modality || test.category || 'N/A',
                                                                amount: test.test_cost || 0
                                                            },
                                                            ...prev.filter(t => t.testId !== test.id)
                                                        ]);
                                                        setPendingTestId('');
                                                        setPendingAmount(0);
                                                    }
                                                } else {
                                                    setPendingTestId('');
                                                    setPendingAmount(0);
                                                }
                                            }}
                                            options={scanCatalog.map(item => ({
                                                value: item.id,
                                                label: item.test_name || item.scan_name || '',
                                                group: item.modality || item.category,
                                                subLabel: `₹${item.test_cost}`
                                            }))}
                                            placeholder="SEARCH FOR SCAN / MRI PROTOCOL..."
                                            keepOpenAfterSelect={true}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Modality</label>
                                            <div className="px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-400">
                                                {scanCatalog.find(i => i.id === pendingTestId)?.category || scanCatalog.find(i => i.id === pendingTestId)?.modality || 'MRI/CT'}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Base Price (₹)</label>
                                            <div className="relative">
                                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <input
                                                    type="number"
                                                    value={pendingAmount}
                                                    onChange={(e) => setPendingAmount(parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-purple-600 focus:border-purple-500 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <button
                                        onClick={() => setShowNewTestModal(true)}
                                        className="w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:border-purple-200 hover:text-purple-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Beaker size={14} />
                                        Register Custom Scan Protocol
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Order Sheet (8/12) */}
                    <div className="xl:col-span-8 flex flex-col gap-8">
                        {/* Selected Scans List */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex-1"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                                        <FileText size={20} />
                                    </div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Studies to be Performed</h3>
                                    <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded-lg ml-2">
                                        {selectedTests.length} Items
                                    </span>
                                </div>
                            </div>

                            <div className="p-8">
                                {selectedTests.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                            <Beaker size={32} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No scan studies selected for this order</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <AnimatePresence mode="popLayout">
                                            {selectedTests.map((test) => (
                                                <motion.div
                                                    key={test.testId}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl group hover:border-purple-200 hover:bg-white hover:shadow-xl hover:shadow-purple-900/5 transition-all"
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-1">
                                                                {test.groupName || 'Radiology Study'}
                                                            </div>
                                                            <div className="text-lg font-black text-slate-900 truncate tracking-tight uppercase">
                                                                {test.testName}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="space-y-1.5 w-40">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (₹)</label>
                                                                <div className="relative">
                                                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" size={12} />
                                                                    <input
                                                                        type="number"
                                                                        value={test.amount}
                                                                        onChange={(e) => handleAmountChange(test.testId, parseFloat(e.target.value) || 0)}
                                                                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-purple-700 focus:border-purple-500 outline-none transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveSelectedTest(test.testId)}
                                                                className="p-3 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Order Details & Meta */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ordering Physician</label>
                                    <select
                                        value={orderingDoctorId}
                                        onChange={(e) => setOrderingDoctorId(e.target.value)}
                                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-purple-500 transition-all outline-none"
                                    >
                                        <option value="">Select Practitioner...</option>
                                        {doctors.map(d => (
                                            <option key={d.id} value={d.id}>Dr. {d.user?.name || d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Indication</label>
                                    <textarea
                                        rows={4}
                                        value={clinicalIndication}
                                        onChange={(e) => setClinicalIndication(e.target.value)}
                                        placeholder="Enter reason for requested study..."
                                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-purple-500 transition-all outline-none resize-none"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Processing Urgency</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['routine', 'urgent', 'stat', 'emergency'] as const).map((u) => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setUrgency(u)}
                                                className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                                    urgency === u 
                                                    ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-900/20' 
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-purple-200'
                                                }`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Study Attachments</label>
                                    <LabXrayAttachments
                                        patientId={patientDetails.id}
                                        testType="scan"
                                        testName={selectedTests.filter(t => t.testId).map(t => t.testName).join(', ')}
                                        uploadedBy={undefined}
                                        onAttachmentChange={() => {}}
                                        showFileBrowser={false}
                                    />
                                </div>
                            </motion.div>
                        </div>

                        {/* Billing Footer Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                <div className="flex items-center gap-12">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Order Total (Estimate)</span>
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-purple-500 text-2xl font-black">₹</span>
                                            <span className="text-6xl font-[1000] text-white tracking-tighter tabular-nums">{totalAmount.toLocaleString()}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-4">Tax incl.</span>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex flex-col border-l border-slate-800 pl-12">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Protocol Count</span>
                                        <div className="flex items-baseline gap-2 text-white">
                                            <span className="text-4xl font-black">{selectedTests.length}</span>
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Studies</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 w-full md:w-auto">
                                    <button
                                        onClick={() => router.push('/lab-xray')}
                                        className="flex-1 md:flex-none px-6 py-4 bg-slate-800 text-slate-400 rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:text-white hover:bg-slate-700 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting || success || selectedTests.length === 0}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-4 px-8 py-4 bg-purple-500 text-white rounded-3xl font-black text-lg hover:bg-purple-400 transition-all shadow-xl shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:scale-100 min-w-[220px]"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="animate-spin h-6 w-6" />
                                                <span className="uppercase tracking-[0.2em] font-black text-xs">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={28} />
                                                <span className="uppercase tracking-[0.2em] font-black text-sm">Checkout Order</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Status Messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            key="error-toast"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed bottom-10 left-1/2 -translate-x-1/2 p-5 bg-white border border-red-100 rounded-[2rem] shadow-2xl flex items-center gap-4 z-[100] max-w-md w-full"
                        >
                            <div className="p-3 bg-red-100 rounded-2xl text-red-600 shadow-sm">
                                <AlertCircle size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">System Error</p>
                                <p className="text-xs text-slate-500 font-bold leading-tight">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="p-2 text-slate-300 hover:text-slate-500">
                                <X size={20} />
                            </button>
                        </motion.div>
                    )}

                    {success && (
                        <motion.div
                            key="success-modal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-6"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center space-y-8 shadow-2xl border border-white/20"
                            >
                                <div className="w-28 h-28 bg-purple-100 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner relative overflow-hidden">
                                    <CheckCircle2 size={56} className="text-purple-600 relative z-10" />
                                    <div className="absolute inset-x-0 bottom-0 h-2 bg-purple-200"></div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Order Locked!</h3>
                                    <p className="text-slate-500 font-bold text-sm tracking-wide leading-relaxed truncate">Procedure request generated and billing initiated for {patientDetails.name}.</p>
                                </div>

                                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4 shadow-inner">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>BILL ID</span>
                                        <span className="text-slate-900 text-xs font-mono">{generatedBill?.bill_id || 'PENDING'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Charged</span>
                                        <span className="text-2xl font-black text-purple-600 tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => router.push('/lab-xray')}
                                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-[900] text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Confirm & Close
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => window.print()}
                                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Printer size={16} /> Print
                                        </button>
                                        <button className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                                            Send SMS
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* New Test Catalog Modal */}
                <AnimatePresence>
                    {showNewTestModal && (
                        <motion.div
                            key="new-radiology-test-modal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[210] p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl space-y-6"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                            {editingCatalogId ? 'Edit Scan Study' : 'Add New Study'}
                                        </h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                            {editingCatalogId ? 'Update existing catalog entry' : 'Register new procedure type'}
                                        </p>
                                    </div>
                                    <button onClick={() => setShowNewTestModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procedure Name</label>
                                        <input
                                            type="text"
                                            value={newTestData.testName}
                                            onChange={(e) => setNewTestData({ ...newTestData, testName: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            placeholder="e.g., MRI Brain"
                                        />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modality (MRI, CT, etc.)</label>
                                        <input
                                            type="text"
                                            value={newTestData.groupName}
                                            onChange={(e) => setNewTestData({ ...newTestData, groupName: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            placeholder="e.g., MRI"
                                        />
                                    </div>
                                    <div className="space-y-2 text-left col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Scan Cost (₹)</label>
                                        <input
                                            type="number"
                                            value={newTestData.amount}
                                            onChange={(e) => setNewTestData({ ...newTestData, amount: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Existing Scans</h4>
                                            <div className="relative">
                                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input 
                                                    type="text"
                                                    placeholder="Search catalog..."
                                                    value={catalogSearchTerm}
                                                    onChange={(e) => setCatalogSearchTerm(e.target.value)}
                                                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                            {scanCatalog
                                                .filter(t => (t.test_name || t.scan_name || '').toLowerCase().includes(catalogSearchTerm.toLowerCase()) || 
                                                           (t.modality || t.category || '').toLowerCase().includes(catalogSearchTerm.toLowerCase()))
                                                .map((test) => (
                                                    <div key={test.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-black text-slate-700 truncate">{test.test_name || test.scan_name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{test.modality || test.category} • ₹{test.test_cost}</p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button 
                                                                onClick={() => handleEditCatalog(test)}
                                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteCatalog(test.id)}
                                                                className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowNewTestModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCatalogEntry}
                                        disabled={creatingTest}
                                        className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {creatingTest ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                                        {editingCatalogId ? 'Update Study' : 'Save Scan'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* New Group Modal */}
                <AnimatePresence>
                    {showNewGroupModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[220] p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl space-y-8"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                            {editingGroupId ? 'Manage Scan Group' : 'Create Protocol Bundle'}
                                        </h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Bundle specific scans together</p>
                                    </div>
                                    <button onClick={() => setShowNewGroupModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Group Name</label>
                                        <input
                                            type="text"
                                            value={newGroupData.name}
                                            onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="e.g., Cardiac Scan Series"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                            <span>Included Studies</span>
                                            <span className="text-purple-600">{newGroupData.items.length} Selected</span>
                                        </label>
                                        
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <SearchableSelect
                                                    value=""
                                                    onChange={(val) => {
                                                        if (!val) return;
                                                        const test = scanCatalog.find(t => t.id === val);
                                                        if (test && !newGroupData.items.find(it => it.testId === val)) {
                                                            setNewGroupData(prev => ({
                                                                ...prev,
                                                                items: [...prev.items, { 
                                                                    testId: test.id, 
                                                                    testName: test.test_name || test.scan_name, 
                                                                    amount: test.test_cost || 0 
                                                                }]
                                                            }));
                                                        }
                                                    }}
                                                    options={scanCatalog.map(t => ({
                                                        value: t.id,
                                                        label: t.test_name || t.scan_name || '',
                                                        group: t.modality || t.category,
                                                        subLabel: `₹${t.test_cost}`
                                                    }))}
                                                    placeholder="Search & add studies..."
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                                            {newGroupData.items.length === 0 ? (
                                                <p className="text-center py-6 text-xs font-bold text-slate-400 uppercase">No studies added yet</p>
                                            ) : (
                                                newGroupData.items.map((item, idx) => (
                                                    <div key={item.testId} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-5 h-5 bg-purple-100 text-purple-700 rounded text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                                                            <span className="text-xs font-bold text-slate-700">{item.testName}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setNewGroupData(prev => ({
                                                                ...prev,
                                                                items: prev.items.filter(it => it.testId !== item.testId)
                                                            }))}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    {editingGroupId && (
                                        <button
                                            onClick={() => handleDeleteGroup(editingGroupId as string)}
                                            className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                            title="Delete Group"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowNewGroupModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveGroup}
                                        disabled={creatingTest || !newGroupData.name}
                                        className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-purple-100"
                                    >
                                        {creatingTest ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                                        {editingGroupId ? 'Update Group' : 'Save Group'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Payment Modal */}
                {generatedBill && (
                    <UniversalPaymentModal
                        isOpen={showPaymentModal}
                        onClose={handlePaymentClose}
                        bill={generatedBill}
                        onSuccess={handlePaymentSuccess}
                    />
                )}
            </div>
        </div>
    );
}