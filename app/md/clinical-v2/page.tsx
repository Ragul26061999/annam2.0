'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import ClinicalEntryForm2 from '../../../src/components/ClinicalEntryForm2';
import { supabase } from '../../../src/lib/supabase';

function ClinicalV2PageWrapper() {
  const searchParams = useSearchParams();
  return <ClinicalV2Page searchParams={searchParams} />;
}

export default function ClinicalV2PageRoot() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClinicalV2PageWrapper />
    </Suspense>
  );
}

function ClinicalV2Page({ searchParams }: { searchParams: ReturnType<typeof useSearchParams> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  const appointmentId = searchParams?.get('appointmentId') ?? '';
  const patientId = searchParams?.get('patientId') ?? '';

  useEffect(() => {
    if (!appointmentId || !patientId) {
      setError('Missing appointmentId or patientId');
      setLoading(false);
      return;
    }

    loadAppointmentData();
  }, [appointmentId, patientId]);

  const loadAppointmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointment')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;
      if (!appointment) throw new Error('Appointment not found');

      const { data: encounter, error: encounterError } = await supabase
        .from('encounter')
        .select('*')
        .eq('id', appointment.encounter_id)
        .single();

      if (encounterError) throw encounterError;
      if (!encounter) throw new Error('Encounter not found');

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, patient_id, name, date_of_birth, gender, phone')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;
      if (!patient) throw new Error('Patient not found');

      let doctor: any = null;
      if (encounter.clinician_id) {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('id', encounter.clinician_id)
          .single();

        if (!doctorError) {
          doctor = doctorData;
        }
      }

      setAppointmentData({
        ...appointment,
        encounter,
        encounter_id: appointment.encounter_id,
        encounterDetails: {
          ...encounter,
          patient,
          doctor,
        },
      });
    } catch (err: any) {
      const safeError = {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        status: err?.status,
        name: err?.name,
        stack: err?.stack,
        raw: err,
      };
      console.error('Error loading appointment data:', safeError);
      try {
        console.error(
          'Error loading appointment data (stringified):',
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
      } catch {
        // ignore
      }
      setError(err?.message || err?.details || 'Failed to load appointment data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading clinical data...</p>
        </div>
      </div>
    );
  }

  if (error || !appointmentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Appointment not found'}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white text-gray-600 hover:text-gray-900 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clinical 2.0</h1>
              <p className="text-sm text-gray-600">
                {appointmentData.encounterDetails?.patient?.name} - {appointmentData.encounterDetails?.patient?.patient_id}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ClinicalEntryForm2
          isOpen={true}
          onClose={() => router.back()}
          appointmentId={appointmentId}
          encounterId={appointmentData.encounter_id}
          patientId={patientId}
          doctorId={appointmentData.encounterDetails?.doctor?.id || appointmentData.encounter?.clinician_id || ''}
          patientName={appointmentData.encounterDetails?.patient?.name || 'Unknown Patient'}
          patientUHID={appointmentData.encounterDetails?.patient?.patient_id || 'N/A'}
          onSuccess={() => {
            // Optional: Handle success, maybe show a success message
            console.log('Clinical entry saved successfully');
          }}
        />
      </div>
    </div>
  );
}
