'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  MapPin,
  Activity,
  Heart,
  Thermometer,
  Droplets,
  Weight,
  Ruler,
  AlertCircle,
  FileText,
  Stethoscope,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { getAppointmentDetails } from '../lib/appointmentService';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
}

interface VitalSign {
  id: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  pain_scale?: number;
  blood_glucose?: number;
  recorded_at: string;
  notes?: string;
}

interface MedicalHistoryItem {
  id: string;
  event_type: string;
  event_name: string;
  event_date: string;
  details?: string;
  doctor_name?: string;
  facility_name?: string;
}

export default function AppointmentDetailsModal({ 
  isOpen, 
  onClose, 
  appointmentId 
}: AppointmentDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'history'>('overview');

  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAppointmentDetails();
    }
  }, [isOpen, appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAppointmentDetails(appointmentId);
      setAppointmentData(data);
    } catch (err: any) {
      console.error('Error fetching appointment details:', err);
      setError(err.message || 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const formatVitalValue = (value: number | undefined, unit: string) => {
    return value ? `${value} ${unit}` : 'N/A';
  };

  const getVitalTrend = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous) return null;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
              <p className="text-gray-600">Patient information and medical data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading appointment details...</span>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                <div>
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : appointmentData ? (
          <>
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('vitals')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'vitals'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vitals ({appointmentData.vitals?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Medical History ({appointmentData.medicalHistory?.length || 0})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Patient Information */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <User className="mr-2" size={20} />
                      Patient Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{appointmentData.appointment.patient?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Patient ID:</span>
                        <span className="font-medium">{appointmentData.appointment.patient?.patient_id || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Age:</span>
                        <span className="font-medium">
                          {appointmentData.appointment.patient?.date_of_birth 
                            ? `${calculateAge(appointmentData.appointment.patient.date_of_birth)} years` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Gender:</span>
                        <span className="font-medium capitalize">{appointmentData.appointment.patient?.gender || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center"><Phone size={16} className="mr-1" />Phone:</span>
                        <span className="font-medium">{appointmentData.appointment.patient?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center"><Mail size={16} className="mr-1" />Email:</span>
                        <span className="font-medium">{appointmentData.appointment.patient?.email || 'N/A'}</span>
                      </div>
                      {appointmentData.appointment.patient?.address && (
                        <div className="flex items-start justify-between">
                          <span className="text-gray-600 flex items-center"><MapPin size={16} className="mr-1" />Address:</span>
                          <span className="font-medium text-right max-w-xs">{appointmentData.appointment.patient.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appointment Information */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="mr-2" size={20} />
                      Appointment Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{appointmentData.appointment.appointment_date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">{appointmentData.appointment.appointment_time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{appointmentData.appointment.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{appointmentData.appointment.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          appointmentData.appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          appointmentData.appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          appointmentData.appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointmentData.appointment.status.charAt(0).toUpperCase() + appointmentData.appointment.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Doctor:</span>
                        <span className="font-medium">{appointmentData.appointment.doctor?.user?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Specialization:</span>
                        <span className="font-medium">{appointmentData.appointment.doctor?.specialization || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Latest Vitals */}
                  {appointmentData.latestVitals && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 lg:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Activity className="mr-2" size={20} />
                        Latest Vital Signs
                        <span className="ml-2 text-sm text-gray-500">
                          ({formatDate(appointmentData.latestVitals.recorded_at)})
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {appointmentData.latestVitals.blood_pressure_systolic && (
                          <div className="bg-red-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Heart className="text-red-500" size={20} />
                            </div>
                            <p className="text-sm text-gray-600">Blood Pressure</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {appointmentData.latestVitals.blood_pressure_systolic}/{appointmentData.latestVitals.blood_pressure_diastolic}
                            </p>
                            <p className="text-xs text-gray-500">mmHg</p>
                          </div>
                        )}
                        {appointmentData.latestVitals.heart_rate && (
                          <div className="bg-pink-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Activity className="text-pink-500" size={20} />
                            </div>
                            <p className="text-sm text-gray-600">Heart Rate</p>
                            <p className="text-lg font-semibold text-gray-900">{appointmentData.latestVitals.heart_rate}</p>
                            <p className="text-xs text-gray-500">bpm</p>
                          </div>
                        )}
                        {appointmentData.latestVitals.temperature && (
                          <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Thermometer className="text-orange-500" size={20} />
                            </div>
                            <p className="text-sm text-gray-600">Temperature</p>
                            <p className="text-lg font-semibold text-gray-900">{appointmentData.latestVitals.temperature}</p>
                            <p className="text-xs text-gray-500">°F</p>
                          </div>
                        )}
                        {appointmentData.latestVitals.oxygen_saturation && (
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Droplets className="text-blue-500" size={20} />
                            </div>
                            <p className="text-sm text-gray-600">Oxygen Saturation</p>
                            <p className="text-lg font-semibold text-gray-900">{appointmentData.latestVitals.oxygen_saturation}</p>
                            <p className="text-xs text-gray-500">%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'vitals' && (
                <div className="space-y-6">
                  {/* Latest Vitals - Colorful Cards */}
                  {appointmentData.latestVitals && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Activity className="mr-2" size={20} />
                        Latest Vital Signs
                        <span className="ml-2 text-sm text-gray-500 font-normal">
                          ({formatDate(appointmentData.latestVitals.recorded_at)})
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {appointmentData.latestVitals.blood_pressure_systolic && (
                          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
                            <div className="relative">
                              <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                                  <Heart className="text-white" size={20} />
                                </div>
                              </div>
                              <p className="text-sm text-red-600 font-medium mb-1">Blood Pressure</p>
                              <p className="text-2xl font-bold text-red-700">
                                {appointmentData.latestVitals.blood_pressure_systolic}/{appointmentData.latestVitals.blood_pressure_diastolic}
                              </p>
                              <p className="text-xs text-red-500 mt-1">mmHg</p>
                            </div>
                          </div>
                        )}
                        {appointmentData.latestVitals.heart_rate && (
                          <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-pink-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
                            <div className="relative">
                              <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center">
                                  <Activity className="text-white" size={20} />
                                </div>
                              </div>
                              <p className="text-sm text-pink-600 font-medium mb-1">Heart Rate</p>
                              <p className="text-2xl font-bold text-pink-700">{appointmentData.latestVitals.heart_rate}</p>
                              <p className="text-xs text-pink-500 mt-1">bpm</p>
                            </div>
                          </div>
                        )}
                        {appointmentData.latestVitals.temperature && (
                          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
                            <div className="relative">
                              <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                                  <Thermometer className="text-white" size={20} />
                                </div>
                              </div>
                              <p className="text-sm text-orange-600 font-medium mb-1">Temperature</p>
                              <p className="text-2xl font-bold text-orange-700">{appointmentData.latestVitals.temperature}</p>
                              <p className="text-xs text-orange-500 mt-1">°F</p>
                            </div>
                          </div>
                        )}
                        {appointmentData.latestVitals.oxygen_saturation && (
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
                            <div className="relative">
                              <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                  <Droplets className="text-white" size={20} />
                                </div>
                              </div>
                              <p className="text-sm text-blue-600 font-medium mb-1">Oxygen Saturation</p>
                              <p className="text-2xl font-bold text-blue-700">{appointmentData.latestVitals.oxygen_saturation}</p>
                              <p className="text-xs text-blue-500 mt-1">%</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vitals History */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="mr-2" size={20} />
                      Vital Signs History
                    </h3>
                    {appointmentData.vitals && appointmentData.vitals.length > 0 ? (
                      <div className="space-y-4">
                        {appointmentData.vitals.map((vital: VitalSign, index: number) => (
                          <div key={vital.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-gray-900">
                                {formatDate(vital.recorded_at)}
                              </h4>
                              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                Reading #{appointmentData.vitals.length - index}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {vital.blood_pressure_systolic && (
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                      <Heart className="text-white" size={16} />
                                    </div>
                                    <div>
                                      <p className="text-sm text-red-600 font-medium">Blood Pressure</p>
                                      <p className="font-bold text-red-700">{vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}</p>
                                      <p className="text-xs text-red-500">mmHg</p>
                                    </div>
                                  </div>
                                  {getVitalTrend(vital.blood_pressure_systolic, appointmentData.vitals[index + 1]?.blood_pressure_systolic)}
                                </div>
                              )}
                              {vital.heart_rate && (
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl border border-pink-200">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                                      <Activity className="text-white" size={16} />
                                    </div>
                                    <div>
                                      <p className="text-sm text-pink-600 font-medium">Heart Rate</p>
                                      <p className="font-bold text-pink-700">{vital.heart_rate}</p>
                                      <p className="text-xs text-pink-500">bpm</p>
                                    </div>
                                  </div>
                                  {getVitalTrend(vital.heart_rate, appointmentData.vitals[index + 1]?.heart_rate)}
                                </div>
                              )}
                              {vital.temperature && (
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                      <Thermometer className="text-white" size={16} />
                                    </div>
                                    <div>
                                      <p className="text-sm text-orange-600 font-medium">Temperature</p>
                                      <p className="font-bold text-orange-700">{vital.temperature}</p>
                                      <p className="text-xs text-orange-500">°F</p>
                                    </div>
                                  </div>
                                  {getVitalTrend(vital.temperature, appointmentData.vitals[index + 1]?.temperature)}
                                </div>
                              )}
                              {vital.oxygen_saturation && (
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                      <Droplets className="text-white" size={16} />
                                    </div>
                                    <div>
                                      <p className="text-sm text-blue-600 font-medium">O2 Saturation</p>
                                      <p className="font-bold text-blue-700">{vital.oxygen_saturation}</p>
                                      <p className="text-xs text-blue-500">%</p>
                                    </div>
                                  </div>
                                  {getVitalTrend(vital.oxygen_saturation, appointmentData.vitals[index + 1]?.oxygen_saturation)}
                                </div>
                              )}
                            </div>
                            {vital.notes && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                <p className="text-sm text-blue-600 font-medium mb-1">Notes:</p>
                                <p className="text-sm text-blue-800">{vital.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                        <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg font-medium">No vital signs recorded</p>
                        <p className="text-gray-500 text-sm mt-1">Vital signs will appear here once recorded</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="mr-2" size={20} />
                    Medical History
                  </h3>
                  {appointmentData.medicalHistory && appointmentData.medicalHistory.length > 0 ? (
                    <div className="space-y-4">
                      {appointmentData.medicalHistory.map((item: MedicalHistoryItem) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                item.event_type === 'Diagnosis' ? 'bg-red-500' :
                                item.event_type === 'Surgery' ? 'bg-orange-500' :
                                item.event_type === 'Vaccination' ? 'bg-green-500' :
                                item.event_type === 'Allergy' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}></div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{item.event_name}</h4>
                                <p className="text-sm text-gray-600">{item.event_type}</p>
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(item.event_date)}</span>
                          </div>
                          {item.details && (
                            <p className="text-gray-700 mb-3">{item.details}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {item.doctor_name && (
                              <span>Doctor: {item.doctor_name}</span>
                            )}
                            {item.facility_name && (
                              <span>Facility: {item.facility_name}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No medical history recorded for this patient.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
