import React from 'react';

export default function DoctorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const unwrappedParams = React.use(params);
  return (
    <div>
      <h1>Doctor Details (Migration Placeholder) - ID: {unwrappedParams.id}</h1>
    </div>
  );
} 