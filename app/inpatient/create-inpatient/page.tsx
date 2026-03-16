'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import InpatientAdmissionForm from '../../../src/components/InpatientAdmissionForm';

function InpatientRegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams?.get('patientId') || undefined;

  const handleRegistrationComplete = () => {
    router.push('/inpatient');
  };

  const handleCancel = () => {
    router.push('/inpatient');
  };

  return (
    <InpatientAdmissionForm
      onComplete={handleRegistrationComplete}
      onCancel={handleCancel}
      initialPatientId={initialPatientId}
    />
  );
}

export default function InpatientRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <InpatientRegisterPageContent />
    </Suspense>
  );
}
