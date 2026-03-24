'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Microscope,
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
    Beaker,
    Stethoscope,
    ChevronDown,
    X,
    Printer,
    Save,
    Loader2,
    Edit3,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import { SearchableSelect } from '../../../src/components/ui/SearchableSelect';
import {
    createLabTestOrder,
    createGroupedLabOrder,
    getLabTestCatalog,
    getDiagnosticGroupItems,
    getDiagnosticGroups,
    createLabTestCatalogEntry,
    createDiagnosticGroup,
    createDiagnosticGroupItem,
    LabTestCatalog,
    updateLabTestCatalogEntry,
    deleteLabTestCatalogEntry,
    updateDiagnosticGroup,
    deleteDiagnosticGroup,
    deleteDiagnosticGroupItemsByGroupId,
    DiagnosticGroup,
    getPatientLabOrders
} from '../../../src/lib/labXrayService';
import { createLabTestBill, type PaymentRecord } from '../../../src/lib/universalPaymentService';
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

export default function LabOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // NOTE: Row-based selection was replaced with a pinned selection bar and a list below it

    // Master Data
    const [labCatalog, setLabCatalog] = useState<LabTestCatalog[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);

    // Group Selection
    const [useGroup, setUseGroup] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [groupLoading, setGroupLoading] = useState(false);

    // Search States
    const [uhidSearch, setUhidSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchingPatient, setSearchingPatient] = useState(false);
    const [activePatientIndex, setActivePatientIndex] = useState(-1);

    // New Test State
    const [showNewTestModal, setShowNewTestModal] = useState(false);
    const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
    const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
    const [newTestData, setNewTestData] = useState({
        testName: '',
        groupName: '',
        amount: 0
    });
    const [creatingTest, setCreatingTest] = useState(false);

    // New Group State
    const [showNewGroupModal, setShowNewGroupModal] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [newGroupData, setNewGroupData] = useState({
        name: '',
        category: 'Lab',
        service_types: ['lab' as const],
        items: [] as Array<{
            service_type: 'lab' | 'radiology' | 'scan' | 'xray';
            catalog_id: string;
            default_selected: boolean;
            sort_order: number;
        }>
    });
    const [creatingGroup, setCreatingGroup] = useState(false);

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

    // Order Details
    const [selectedTests, setSelectedTests] = useState<TestSelection[]>([]);
    // Pinned selection bar state
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
                const labGroups = (groups || []).filter((g: any) => {
                    const serviceTypes: string[] = Array.isArray(g.service_types) ? g.service_types : [];
                    // If service_types not set, fall back to category
                    if (serviceTypes.length === 0) {
                        return String(g.category || '').toLowerCase() === 'lab' || String(g.category || '').toLowerCase() === 'mixed';
                    }
                    return serviceTypes.includes('lab');
                });
                setAvailableGroups(labGroups);
            } catch (e) {
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
            setActivePatientIndex(-1);
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
            const [catalog, doctorsList] = await Promise.all([
                getLabTestCatalog(),
                getAllDoctorsSimple()
            ]);
            setLabCatalog((catalog || []).sort((a: any, b: any) => String(b.id).localeCompare(String(a.id))));
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

        setUhidSearch(patient.name); // Show selected patient name
        setShowSearchDropdown(false);
        setSearchResults([]);
        setActivePatientIndex(-1);
        setError(null);

        // Load existing lab orders for this patient
        await loadPatientOrders(patient.id);
    };

    const loadPatientOrders = async (patientId: string) => {
        if (!patientId) return;
        setLoadingOrders(true);
        try {
            const orders = await getPatientLabOrders(patientId);
            // Filter only scheduled and sample_pending orders
            const filteredOrders = orders.filter((order: any) => 
                order.status === 'scheduled' || order.status === 'sample_pending'
            );
            // Enrich orders with catalog data
            const enrichedOrders = await Promise.all(
                filteredOrders.map(async (order: any) => {
                    const { data: catalog } = await supabase
                        .from('lab_test_catalog')
                        .select('*')
                        .eq('id', order.test_catalog_id)
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
            case 'sample_pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'sample_collected': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
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
            setError('Test name and group name are required.');
            return;
        }

        try {
            setCreatingTest(true);
            
            if (editingCatalogId) {
                // Update existing test
                const updated = await updateLabTestCatalogEntry(editingCatalogId, {
                    test_name: newTestData.testName,
                    category: newTestData.groupName,
                    test_cost: newTestData.amount
                });
                
                setLabCatalog(prev => prev.map(t => t.id === editingCatalogId ? updated : t));
                setSelectedTests(prev => prev.map(t => t.testId === editingCatalogId ? {
                    ...t,
                    testName: updated.test_name,
                    groupName: updated.category || 'N/A',
                    amount: updated.test_cost
                } : t));
                
                setEditingCatalogId(null);
                setNewTestData({ testName: '', groupName: '', amount: 0 });
            } else {
                // Create new test
                const newEntry = await createLabTestCatalogEntry({
                    test_name: newTestData.testName,
                    category: newTestData.groupName,
                    test_cost: newTestData.amount
                });

                // Update master data
                setLabCatalog(prev => [newEntry, ...prev]);

                // Add newly created test to the top of the selected list (last selected first)
                setSelectedTests(prev => [
                    {
                        testId: newEntry.id,
                        testName: newEntry.test_name,
                        groupName: newEntry.category || 'N/A',
                        amount: newEntry.test_cost || 0
                    },
                    // Remove any previous occurrence of this test
                    ...prev.filter(t => t.testId !== newEntry.id)
                ]);
                
                setNewTestData({ testName: '', groupName: '', amount: 0 });
            }

            // Do not close modal automatically so they can see existing tests
            // setShowNewTestModal(false);
        } catch (err: any) {
            console.error('Error saving test:', err);
            setError('Failed to save test catalog entry.');
        } finally {
            setCreatingTest(false);
        }
    };

    const handleEditCatalog = (test: LabTestCatalog) => {
        setEditingCatalogId(test.id);
        setNewTestData({
            testName: test.test_name,
            groupName: test.category || '',
            amount: test.test_cost
        });
    };

    const handleDeleteCatalog = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this test? Cannot be undone.')) return;
        try {
            await deleteLabTestCatalogEntry(id);
            setLabCatalog(prev => prev.filter(t => t.id !== id));
            setSelectedTests(prev => prev.filter(t => t.testId !== id));
        } catch (err: any) {
            setError('Failed to delete catalog entry');
            console.error(err);
        }
    };

    // Selection bar actions
    const handleAddPendingTest = () => {
        if (!pendingTestId) return;
        const test = labCatalog.find(t => t.id === pendingTestId);
        if (!test) return;
        setSelectedTests(prev => [
            {
                testId: test.id,
                testName: test.test_name,
                groupName: test.category || 'N/A',
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

    const applyGroupToSelection = async (groupId: string) => {
        if (!groupId) return;
        setGroupLoading(true);
        setError(null);
        try {
            const groupItems = await getDiagnosticGroupItems(groupId);
            const labItems = (groupItems || []).filter((it: any) => String(it.service_type) === 'lab');
            const selections: TestSelection[] = labItems
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((it: any) => {
                    const test = labCatalog.find(t => t.id === it.catalog_id);
                    return {
                        testId: it.catalog_id,
                        testName: test?.test_name || '',
                        groupName: test?.category || 'N/A',
                        amount: test?.test_cost || 0
                    };
                })
                .filter(s => Boolean(s.testId));

            // Append group's tests to existing selections without erasing; deduplicate by testId
            setSelectedTests(prev => {
                const prevFiltered = prev.filter(p => !selections.some(s => s.testId === p.testId));
                // Place new group's items on top, keep existing items after
                return [...selections, ...prevFiltered];
            });
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

    const handleSaveGroup = async () => {
        if (!newGroupData.name.trim()) {
            setError('Group name is required');
            return;
        }

        setCreatingGroup(true);
        setError(null);

        try {
            let groupId = editingGroupId;
            if (editingGroupId) {
                // Update the group details
                await updateDiagnosticGroup(editingGroupId, {
                    name: newGroupData.name.trim(),
                    category: newGroupData.category,
                    service_types: newGroupData.service_types
                });
                // Delete existing items
                await deleteDiagnosticGroupItemsByGroupId(editingGroupId);
            } else {
                // Create new group
                const group = await createDiagnosticGroup({
                    name: newGroupData.name.trim(),
                    category: newGroupData.category,
                    service_types: newGroupData.service_types
                });
                groupId = group.id;
            }

            // Add items to the group if any are selected
            if (newGroupData.items.length > 0 && groupId) {
                for (const item of newGroupData.items) {
                    await createDiagnosticGroupItem({
                        group_id: groupId,
                        service_type: item.service_type,
                        catalog_id: item.catalog_id,
                        default_selected: item.default_selected,
                        sort_order: item.sort_order
                    });
                }
            }

            // Refresh the groups list
            const groups = await getDiagnosticGroups({ is_active: true });
            const labGroups = (groups || []).filter((g: any) => {
                const serviceTypes: string[] = Array.isArray(g.service_types) ? g.service_types : [];
                if (serviceTypes.length === 0) {
                    return String(g.category || '').toLowerCase() === 'lab' || String(g.category || '').toLowerCase() === 'mixed';
                }
                return serviceTypes.includes('lab');
            });
            setAvailableGroups(labGroups);

            // Reset form
            setNewGroupData({
                name: '',
                category: 'Lab',
                service_types: ['lab'],
                items: []
            });
            // Refresh current selection if it was the group being edited
            if (editingGroupId === selectedGroupId && groupId) {
                await applyGroupToSelection(groupId);
            }
            
            setEditingGroupId(null);
            // Optionally auto-select if creating new
            if (!editingGroupId && groupId) {
                setSelectedGroupId(groupId);
                await applyGroupToSelection(groupId);
            }
            setShowNewGroupModal(false);

        } catch (e: any) {
            setError(e?.message || 'Failed to save group');
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleEditGroup = async (group: DiagnosticGroup) => {
        setEditingGroupId(group.id);
        const serviceTypes = group.service_types && group.service_types.length > 0 
            ? group.service_types 
            : ['lab' as const];
            
        // Fetch items for this group
        setGroupLoading(true);
        try {
            const items = await getDiagnosticGroupItems(group.id);
            setNewGroupData({
                name: group.name,
                category: group.category,
                service_types: serviceTypes as any,
                items: items as any
            });
        } catch (e: any) {
            setError('Failed to load group items');
        } finally {
            setGroupLoading(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this group? Cannot be undone.')) return;
        try {
            await deleteDiagnosticGroupItemsByGroupId(id);
            await deleteDiagnosticGroup(id);
            setAvailableGroups(prev => prev.filter(g => g.id !== id));
            if (selectedGroupId === id) clearGroupSelection();
        } catch (err: any) {
            setError('Failed to delete diagnostic group');
            console.error(err);
        }
    };

    const addTestToGroup = (testId: string) => {
        const test = labCatalog.find(t => t.id === testId);
        if (!test) return;

        const existingItem = newGroupData.items.find(item => item.catalog_id === testId);
        if (existingItem) return;

        setNewGroupData(prev => ({
            ...prev,
            items: [...prev.items, {
                service_type: 'lab' as const,
                catalog_id: testId,
                default_selected: true,
                sort_order: prev.items.length
            }]
        }));
    };

    const removeTestFromGroup = (catalogId: string) => {
        setNewGroupData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.catalog_id !== catalogId)
        }));
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
                            groupName: testCatalog.category || 'N/A',
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientDetails.id) {
            setError('Please search and select a patient first.');
            return;
        }
        if (selectedTests.length === 0) {
            setError('Please add at least one test.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Create individual lab test orders
            const orderPromises = selectedTests.map(test =>
                createLabTestOrder({
                    patient_id: patientDetails.id,
                    ordering_doctor_id: orderingDoctorId || undefined,
                    test_catalog_id: test.testId,
                    amount: test.amount,
                    clinical_indication: clinicalIndication,
                    urgency: urgency,
                    status: 'ordered',
                    staff_id: staffId || undefined
                })
            );
            const orders = await Promise.all(orderPromises);

            // Create bill for the lab tests
            const bill = await createLabTestBill(patientDetails.id, orders, staffId);
            setGeneratedBill(bill);

            // Show payment modal
            setShowPaymentModal(true);
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to create orders.');
        } finally {
            setSubmitting(false);
        }
    };

    // Update pending amount automatically when pending test changes
    useEffect(() => {
        if (!pendingTestId) {
            setPendingAmount(0);
            return;
        }
        const t = labCatalog.find(item => item.id === pendingTestId);
        setPendingAmount(t?.test_cost || 0);
    }, [pendingTestId, labCatalog]);

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
        // Payment was cancelled — just close the modal, stay on page so user can retry
        setShowPaymentModal(false);
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 text-teal-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Preparing Lab Suite...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6">
        <div className="max-w-[1550px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/lab-xray" className="group flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-teal-200 transition-all">
                            <ChevronLeft size={20} />
                        </div>
                        <span className="font-bold tracking-tight">Return to Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
                            <Clock size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content - Stacked Layout */}
                <div className="flex flex-col gap-6">
                    {/* Patient Information - Rectangular Section */}
                    <div className="w-full">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[32px] border border-slate-200 shadow-sm"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-600/20">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900">Patient Information</h2>
                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Demographics & Identity</p>
                                        </div>
                                    </div>

                                    {/* UHID Search - Moved to top for better access */}
                                    <div className="w-full md:w-96 search-container">
                                        <div className="relative group">
                                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchingPatient ? 'text-teal-500' : 'text-slate-400 group-focus-within:text-teal-500'}`} size={18} />
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
                                                className="w-full pl-12 pr-12 py-3 bg-white border-2 border-slate-100 focus:border-teal-500 rounded-2xl transition-all outline-none text-sm font-semibold text-slate-700 shadow-sm"
                                            />
                                            {uhidSearch && (
                                                <button
                                                    onClick={() => {
                                                        setUhidSearch('');
                                                        setSearchResults([]);
                                                        setShowSearchDropdown(false);
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
                                                                activePatientIndex === index ? 'bg-teal-50' : 'hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                                                <User size={16} className="text-teal-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-semibold text-slate-900 truncate">
                                                                    {patient.name}
                                                                </div>
                                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                                                        {patient.patient_id}
                                                                    </span>
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

                            <div className="p-8">
                                {/* Horizontal Field Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Hash size={12} /> UHID
                                        </label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-teal-700 shadow-sm">
                                            {patientDetails.uhid || '--'}
                                        </div>
                                    </div>
                                    <div className="lg:col-span-1 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <User size={12} /> Full Name
                                        </label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 shadow-sm truncate">
                                            {patientDetails.name || '--'}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={12} /> Age
                                        </label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 shadow-sm">
                                            {patientDetails.age ? `${patientDetails.age} Years` : '--'}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Stethoscope size={12} /> Gender
                                        </label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 shadow-sm capitalize">
                                            {patientDetails.gender || '--'}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Phone size={12} /> Contact
                                        </label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 shadow-sm">
                                            {patientDetails.contactNo || '--'}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Mail size={12} /> Email
                                        </label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 shadow-sm truncate">
                                            {patientDetails.emailId || '--'}
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Note Integrated */}
                                <div className="mt-8 bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-center">
                                    <AlertCircle size={18} className="text-amber-500 shrink-0" />
                                    <p className="text-[11px] text-amber-800 font-bold uppercase tracking-[0.1em]">
                                        Note: This bill creates a pending transaction. Verify patient details before generating.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Existing Lab Orders for Patient */}
                        {patientDetails.id && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-[32px] border border-slate-200 shadow-sm mt-6 overflow-hidden"
                            >
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900">Existing Lab Orders</h2>
                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                                {patientOrders.length} order(s) for this patient
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedOrderIds.size > 0 && (
                                            <button
                                                onClick={handleBillSelectedOrders}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                                            >
                                                <Plus size={16} />
                                                Bill ({selectedOrderIds.size})
                                            </button>
                                        )}
                                        <button
                                            onClick={() => loadPatientOrders(patientDetails.id)}
                                            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                            title="Refresh Orders"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {loadingOrders ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                            <span className="ml-2 text-slate-500">Loading orders...</span>
                                        </div>
                                    ) : patientOrders.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500 font-medium">No existing lab orders for this patient</p>
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
                                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Order #</th>
                                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Test Name</th>
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
                                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-sm font-mono text-slate-600">
                                                                {order.order_number || order.id.slice(0, 8)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="font-semibold text-slate-800">
                                                                    {order.test_catalog?.test_name || 'Unknown Test'}
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
                    </div>

                    {/* Lab Test Selection - Rectangular Section */}
                    <div className="w-full">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-600/20">
                                        <Beaker size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900">Lab Test Selection</h2>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Diagnostic Order Details</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowNewTestModal(true)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-black hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm"
                                    >
                                        <Plus size={18} />
                                        New Catalog Entry
                                    </button>
                                </div>
                            </div>

                            <div className="p-8">
                                {/* Split Screen Selection Layout */}
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                                    
                                    {/* Left Column: Selection Controls (5/12) */}
                                    <div className="xl:col-span-4 space-y-6 sticky top-6 h-fit">
                                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 space-y-6">
                                            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Select New Test</h3>
                                                {/* Group selector toggle */}
                                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={useGroup}
                                                        onChange={(e) => {
                                                            const next = e.target.checked;
                                                            setUseGroup(next);
                                                            if (!next) setSelectedGroupId('');
                                                        }}
                                                        className="rounded text-teal-600 focus:ring-teal-500"
                                                    />
                                                    Use Group
                                                </label>
                                            </div>

                                            {useGroup && (
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Diagnostic Group</label>
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={selectedGroupId}
                                                            onChange={async (e) => {
                                                                const id = e.target.value;
                                                                setSelectedGroupId(id);
                                                                await applyGroupToSelection(id);
                                                            }}
                                                            className="min-w-0 flex-1 px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-teal-500 outline-none"
                                                        >
                                                            <option value="">Select Group...</option>
                                                            {availableGroups.map((g: any) => (
                                                                <option key={g.id} value={g.id}>{g.name}</option>
                                                            ))}
                                                        </select>
                                                        
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingGroupId(null);
                                                                    setNewGroupData({ name: '', category: 'Lab', service_types: ['lab'], items: [] });
                                                                    setShowNewGroupModal(true);
                                                                }}
                                                                className="p-2.5 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition-colors"
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
                                                                                setShowNewGroupModal(true);
                                                                            }
                                                                        }}
                                                                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                                                        title="Edit Selected Group"
                                                                    >
                                                                        <Edit3 size={18} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteGroup(selectedGroupId)}
                                                                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                                                        title="Delete Selected Group"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-5">
                                                {/* Test Name Search */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Test Name</label>
                                                    <SearchableSelect
                                                        value={pendingTestId}
                                                        onChange={(value: string) => {
                                                            setPendingTestId(value);
                                                            if (value) {
                                                                const test = labCatalog.find(t => t.id === value);
                                                                if (test) {
                                                                    setSelectedTests(prev => [
                                                                        ...prev.filter(t => t.testId !== test.id),
                                                                        {
                                                                            testId: test.id,
                                                                            testName: test.test_name,
                                                                            groupName: test.category || 'N/A',
                                                                            amount: test.test_cost || 0
                                                                        }
                                                                    ]);
                                                                    setPendingTestId('');
                                                                    setPendingAmount(0);
                                                                }
                                                            }
                                                        }}
                                                        options={labCatalog.map(item => ({
                                                            value: item.id,
                                                            label: item.test_name,
                                                            group: item.category,
                                                            subLabel: `₹${item.test_cost}`
                                                        }))}
                                                        placeholder="Search & Select Test..."
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category</label>
                                                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-500 truncate min-h-[46px] flex items-center">
                                                            {labCatalog.find(i => i.id === pendingTestId)?.category || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (₹)</label>
                                                        <div className="relative">
                                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                            <input
                                                                type="number"
                                                                value={pendingAmount}
                                                                onChange={(e) => setPendingAmount(parseFloat(e.target.value) || 0)}
                                                                className="w-full pl-9 pr-4 py-3 bg-white border-2 border-slate-100 focus:border-teal-500 rounded-xl text-sm font-bold text-teal-700 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleAddPendingTest}
                                                    disabled={!pendingTestId}
                                                    className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <Plus size={18} />
                                                    Add to Selected
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Selected Tests List (7/12) */}
                                    <div className="xl:col-span-8 space-y-4">
                                        <div className="flex items-center justify-between px-2 mb-2">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Selected Tests</h3>
                                            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{selectedTests.length} Items</span>
                                        </div>

                                        <div className="space-y-3 min-h-[400px] border-2 border-dashed border-slate-100 rounded-[32px] p-6 bg-slate-50/30">
                                            <AnimatePresence mode="popLayout">
                                                {selectedTests.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                                                        <div className="p-4 bg-white rounded-3xl mb-4 shadow-sm">
                                                            <Beaker size={32} strokeWidth={1.5} />
                                                        </div>
                                                        <p className="text-sm font-bold">No tests selected yet</p>
                                                        <p className="text-xs font-medium opacity-60 mt-1">Search and add tests from the left panel</p>
                                                    </div>
                                                ) : (
                                                    selectedTests.map((test) => (
                                                        <motion.div
                                                            key={`test-${test.testId}`}
                                                            layout
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-6 group hover:border-teal-200 hover:shadow-md transition-all relative"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Test Name</div>
                                                                <div className="font-bold text-slate-800 text-lg truncate">{test.testName}</div>
                                                            </div>
                                                            
                                                            <div className="w-48 hidden md:block border-l border-slate-100 pl-6">
                                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Category</div>
                                                                <div className="font-bold text-slate-600 truncate">{test.groupName || 'N/A'}</div>
                                                            </div>

                                                            <div className="w-40 border-l border-slate-100 pl-6">
                                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Amount</div>
                                                                <div className="relative">
                                                                    <Hash className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                                    <input
                                                                        type="number"
                                                                        value={test.amount}
                                                                        onChange={(e) => handleAmountChange(test.testId, parseFloat(e.target.value) || 0)}
                                                                        className="w-full pl-5 pr-2 py-1 bg-transparent font-black text-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-100 rounded"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => handleRemoveSelectedTest(test.testId)}
                                                                className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ordering Doctor (Optional)</label>
                                            <select
                                                value={orderingDoctorId}
                                                onChange={(e) => setOrderingDoctorId(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                            >
                                                <option value="">Select Doctor...</option>
                                                {doctors.map(d => (
                                                    <option key={d.id} value={d.id}>Dr. {d.user?.name || d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <StaffSelect
                                                value={staffId}
                                                onChange={setStaffId}
                                                label="Ordered By (Staff) (Optional)"
                                                required={false}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Clinical Indication</label>
                                            <textarea
                                                rows={3}
                                                value={clinicalIndication}
                                                onChange={(e) => setClinicalIndication(e.target.value)}
                                                placeholder="Reason for test..."
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lab Test Attachments</label>
                                            <LabXrayAttachments
                                                patientId={patientDetails.id}
                                                testType="lab"
                                                testName={selectedTests.filter(t => t.testId).map(t => t.testName).join(', ')}
                                                uploadedBy={undefined}
                                                onAttachmentChange={() => {
                                                    // Refresh attachments if needed
                                                }}
                                                showFileBrowser={false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Billing Footer */}
                            <div className="p-6 bg-slate-900 rounded-b-3xl mt-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Amount</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-slate-400 text-sm font-bold">₹</span>
                                                <span className="text-4xl font-black text-white">{totalAmount.toLocaleString()}</span>
                                                <span className="text-teal-400 text-xs font-black ml-2 uppercase">Gst Incl.</span>
                                            </div>
                                        </div>
                                        <div className="h-10 w-[1px] bg-slate-700 hidden md:block"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tests Selected</span>
                                            <span className="text-2xl font-black text-white">{selectedTests.filter(t => t.testId).length} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1">Items</span></span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 w-full md:w-auto">
                                        <button
                                            onClick={() => router.push('/lab-xray')}
                                            className="flex-1 md:flex-none px-8 py-4 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all border border-slate-700"
                                        >
                                            Draft
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting || success}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-teal-500 text-white rounded-2xl font-black text-lg hover:bg-teal-400 transition-all shadow-xl shadow-teal-900/40 disabled:opacity-50 min-w-[220px]"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="animate-spin h-5 w-5" />
                                                    Processing...
                                                </>
                                            ) : success ? (
                                                <>
                                                    <CheckCircle2 size={24} />
                                                    Success
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard size={24} />
                                                    Generate Bill
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Status Messages */}
                <AnimatePresence>
                    {
                        error && (
                            <motion.div
                                key="error-toast"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="fixed bottom-8 right-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl shadow-xl flex items-center gap-3 z-50 max-w-md"
                            >
                                <div className="p-2 bg-red-100 rounded-xl text-red-600">
                                    <AlertCircle size={20} />
                                </div>
                                <p className="text-sm font-bold">{error}</p>
                                <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-md transition-colors">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        )
                    }

                    {
                        success && (
                            <motion.div
                                key="success-modal"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                            >
                                <div className="bg-white rounded-[40px] p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
                                    <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <CheckCircle2 size={48} className="text-teal-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Orders Generated!</h3>
                                        <p className="text-slate-500 font-medium mt-2">Laboratory clinical request initiated and billing data transmitted.</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                            <span>Invoice Ref</span>
                                            <span className="text-slate-900">{generatedBill?.bill_id || 'PENDING'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                            <span>Total Bill</span>
                                            <span className="text-teal-600">₹{totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => router.push('/lab-xray')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={() => window.print()}
                                            className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                                            title="Print Bill"
                                        >
                                            <Printer size={20} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    }

                    {
                        showNewTestModal && (
                            <motion.div
                                key="new-test-modal-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-black text-slate-900">{editingCatalogId ? 'Edit Test Catalog' : 'Add New Test Catalog'}</h3>
                                        <button onClick={() => {
                                            setShowNewTestModal(false);
                                            setEditingCatalogId(null);
                                            setNewTestData({ testName: '', groupName: '', amount: 0 });
                                        }} className="p-2 hover:bg-slate-100 rounded-full">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Test Name</label>
                                            <input
                                                type="text"
                                                value={newTestData.testName}
                                                onChange={(e) => setNewTestData({ ...newTestData, testName: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                placeholder="e.g., Blood Sugar"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTestData({ ...newTestData, groupName: 'Biochemistry' })}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                                                >
                                                    Biochemistry
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTestData({ ...newTestData, groupName: 'Hematology' })}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                                                >
                                                    Hematology
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTestData({ ...newTestData, groupName: 'Scans/Other' })}
                                                    className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-black hover:bg-teal-100 transition-colors border border-teal-100"
                                                >
                                                    Scans/Other (ECG/EEG)
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={newTestData.groupName}
                                                onChange={(e) => setNewTestData({ ...newTestData, groupName: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                placeholder="e.g., Biochemistry"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={newTestData.amount}
                                                onChange={(e) => setNewTestData({ ...newTestData, amount: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                if (editingCatalogId) {
                                                    setEditingCatalogId(null);
                                                    setNewTestData({ testName: '', groupName: '', amount: 0 });
                                                } else {
                                                    setShowNewTestModal(false);
                                                }
                                            }}
                                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                        >
                                            {editingCatalogId ? 'Cancel Edit' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={handleSaveCatalogEntry}
                                            disabled={creatingTest}
                                            className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {creatingTest ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                                            {editingCatalogId ? 'Update Catalog' : 'Save Catalog'}
                                        </button>
                                    </div>
                                    
                                    {/* Existing Tests List */}
                                    <div className="mt-8 pt-8 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Existing Tests</h4>
                                            <div className="relative w-64">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search tests..."
                                                    value={catalogSearchTerm}
                                                    onChange={(e) => setCatalogSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {labCatalog
                                                .filter(t => t.test_name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) || (t.category || '').toLowerCase().includes(catalogSearchTerm.toLowerCase()))
                                                .slice(0, 50)  // Limit to 50 for performance
                                                .map(test => (
                                                <div key={test.id} className={`flex items-center justify-between p-3 rounded-xl border ${editingCatalogId === test.id ? 'border-teal-500 bg-teal-50/50' : 'border-slate-100 bg-white hover:border-slate-300'} transition-colors`}>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{test.test_name}</div>
                                                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded-full">{test.category || 'No Category'}</span>
                                                            <span className="text-teal-600 font-bold">₹{test.test_cost}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleEditCatalog(test)}
                                                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title="Edit Test"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCatalog(test.id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Test"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {labCatalog.filter(t => t.test_name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) || (t.category || '').toLowerCase().includes(catalogSearchTerm.toLowerCase())).length === 0 && (
                                                <div className="text-center py-6 text-slate-500 text-sm">No tests found.</div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }

                    {/* New Group Modal */}
                    {
                        showNewGroupModal && (
                            <motion.div
                                key="new-group-modal-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                                onClick={() => setShowNewGroupModal(false)}
                            >
                                <motion.div
                                    key="new-group-modal"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-black text-slate-900">{editingGroupId ? 'Edit Test Group' : 'Create New Test Group'}</h3>
                                        <button onClick={() => {
                                            setShowNewGroupModal(false);
                                            setEditingGroupId(null);
                                            setNewGroupData({ name: '', category: 'Lab', service_types: ['lab'], items: [] });
                                        }} className="p-2 hover:bg-slate-100 rounded-full">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Group Name *</label>
                                            <input
                                                type="text"
                                                value={newGroupData.name}
                                                onChange={(e) => setNewGroupData(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                placeholder="e.g., Basic Blood Tests, Cardiac Panel"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                                            <select
                                                value={newGroupData.category}
                                                onChange={(e) => setNewGroupData(prev => ({ ...prev, category: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                            >
                                                <option value="Lab">Lab</option>
                                                <option value="Radiology">Radiology</option>
                                                <option value="Mixed">Mixed</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Add Tests to Group (Optional)</label>
                                            <div className="border border-slate-200 rounded-xl p-4">
                                                <div className="mb-3">
                                                    <select
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                addTestToGroup(e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                    >
                                                        <option value="">Select tests to add...</option>
                                                        {labCatalog
                                                            .filter(test => !newGroupData.items.find(item => item.catalog_id === test.id))
                                                            .map(test => (
                                                                <option key={test.id} value={test.id}>
                                                                    {test.test_name} - ₹{test.test_cost}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>

                                                {newGroupData.items.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-slate-600">Selected Tests:</p>
                                                        {newGroupData.items.map((item, index) => {
                                                            const test = labCatalog.find(t => t.id === item.catalog_id);
                                                            return (
                                                                <div key={item.catalog_id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-800">{test?.test_name}</p>
                                                                        <p className="text-xs text-slate-500">₹{test?.test_cost}</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTestFromGroup(item.catalog_id)}
                                                                        className="p-1 hover:bg-red-100 rounded text-red-500"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => {
                                                if (editingGroupId) {
                                                    setEditingGroupId(null);
                                                    setNewGroupData({ name: '', category: 'Lab', service_types: ['lab'], items: [] });
                                                } else {
                                                    setShowNewGroupModal(false);
                                                }
                                            }}
                                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                        >
                                            {editingGroupId ? 'Cancel Edit' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={handleSaveGroup}
                                            disabled={creatingGroup || !newGroupData.name.trim()}
                                            className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {creatingGroup ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                                            {editingGroupId ? 'Update Group' : 'Save Group'}
                                        </button>
                                    </div>
                                    
                                    {/* Existing Groups List */}
                                    <div className="mt-8 pt-8 border-t border-slate-100">
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Existing Groups</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {availableGroups.map(group => (
                                                <div key={group.id} className={`flex items-center justify-between p-3 rounded-xl border ${editingGroupId === group.id ? 'border-teal-500 bg-teal-50/50' : 'border-slate-100 bg-white hover:border-slate-300'} transition-colors`}>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{group.name}</div>
                                                        <div className="text-xs font-semibold text-slate-500">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded-full">{group.category}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleEditGroup(group)}
                                                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title="Edit Group"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteGroup(group.id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Group"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {availableGroups.length === 0 && (
                                                <div className="text-center py-6 text-slate-500 text-sm">No groups found.</div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* Payment Modal */}
                {generatedBill && (
                    <UniversalPaymentModal
                        isOpen={showPaymentModal}
                        onClose={handlePaymentClose}
                        bill={generatedBill}
                        onSuccess={handlePaymentSuccess}
                    />
                )}
            </div >
        </div >
    );
}
