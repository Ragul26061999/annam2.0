import React from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { IPDischargeSummary } from '../../lib/ipClinicalService';

interface DischargePrintTemplateProps {
  summary: Partial<IPDischargeSummary>;
  patient: any;
  bedAllocation: any;
}

export const DischargePrintTemplate = React.forwardRef<HTMLDivElement, DischargePrintTemplateProps>(
  ({ summary, patient, bedAllocation }, ref) => {
    // Helper to format dates
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '______________________';
      return new Date(dateStr).toLocaleDateString('en-GB'); // DD/MM/YYYY format
    };

    // Use a Portal to render directly into body, bypassing modal nesting
    // This ensures print styles work correctly and aren't affected by parent overflow/hiding
    return createPortal(
      <div ref={ref} className="bg-white text-black print-template hidden print:block print-portal-root">
        <style jsx global>{`
          @media print {
            /* Reset body */
            body {
              margin: 0;
              padding: 0;
              background: white;
              height: auto;
              overflow: visible;
            }
            
            /* Hide EVERYTHING in the body first */
            body > * {
              display: none !important;
            }

            /* But show our portal root */
            body > .print-portal-root {
              display: block !important;
              position: relative;
              top: auto;
              left: auto;
              width: 100%;
              height: auto;
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: black;
              background: white;
              z-index: 9999;
              visibility: visible;
            }

            /* Explicitly hide standard app roots just in case */
            #root, #modal-root {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 15mm 20mm 15mm 20mm;
            }

            @media print {
              /* Ensure the header container doesn't overlap with browser's default header text */
              .print-header-container {
                padding-top: 12mm;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
            }

            .section-break {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 2rem;
            }
            
            .force-break {
              break-before: page;
              page-break-before: always;
            }
          }
        `}</style>

        {/* Header Block */}
        <div className="section-break print-header-container">
          <div className="flex flex-col items-center justify-center mb-2">
            {/* Logo */}
            <div className="h-28 w-full flex items-center justify-center mb-2">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk,</p>
              <p className="text-sm font-semibold text-gray-800">Thoothukudi - 628 216. Cell: 8681850592, 8681950592</p>
              <div className="text-sm text-gray-800 mt-1">
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4 pb-2 border-b-2 border-gray-800">
            <h2 className="text-lg font-bold uppercase inline-block px-4 pb-1 text-blue-900 tracking-wider">
              DISCHARGE SUMMARY
            </h2>
          </div>
        </div>

        {/* Patient Identification */}
        <div className="section-break mb-8">          {/* Identification Section */}
          <div className="flex gap-10 text-sm font-medium pt-4">
            {/* Left Column (Personal & Medical Team) */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="flex items-baseline">
                <span className="font-bold w-40 shrink-0">Name :</span>
                <span className="flex-1 uppercase font-bold border-b border-dotted border-gray-400 pb-1">
                  {(summary.patient_name || patient?.name) ? (summary.patient_name || patient?.name) : '______________________'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-40 shrink-0 mt-1">Address :</span>
                <span className="flex-1 min-h-[48px] whitespace-pre-wrap border-b border-dotted border-gray-400 pb-1">
                  {summary.address || (() => {
                    const addressParts = [];
                    if (patient?.address) addressParts.push(String(patient.address));
                    if (patient?.city) addressParts.push(String(patient.city));
                    if (patient?.state) addressParts.push(String(patient.state));
                    if (patient?.pincode) addressParts.push(String(patient.pincode));
                    return addressParts.length > 0 ? addressParts.join(',\n') : '______________________';
                  })()}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-40 shrink-0">Consultant :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1 uppercase">{summary.consult_doctor_name || summary.consultant_name || '-'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-40 shrink-0">Surgeon :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1 uppercase">{summary.surgeon_doctor_name || '-'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-40 shrink-0">Anesthesiologist :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1 uppercase">{summary.anesthesiologist_doctor || '-'}</span>
              </div>
            </div>

            {/* Right Column (Administrative & Dates) */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="flex items-baseline">
                <span className="font-bold w-44 shrink-0">Age & Sex :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">
                  {String(summary.age || patient?.age || '__')} Yrs / {String(summary.gender || patient?.gender || '__')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-baseline flex-1">
                  <span className="font-bold w-20 shrink-0">O.P. No.</span>
                  <span className="flex-1 uppercase font-bold border-b border-dotted border-gray-400 pb-1">
                    {String(patient?.patient_id || '______________________')}
                  </span>
                </div>
                <div className="flex items-baseline flex-1 ml-4">
                  <span className="font-bold w-16 shrink-0 text-right pr-2">I.P. No.</span>
                  <span className="flex-1 uppercase font-bold border-b border-dotted border-gray-400 pb-1">
                    {bedAllocation?.ip_number || '______________________'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline">
                <span className="font-bold w-44 shrink-0">Date of Admission :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(bedAllocation?.admission_date)}</span>
              </div>
              
              <div className="flex items-baseline">
                <span className="font-bold w-44 shrink-0">Date of Surgery :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{summary.surgery_date ? formatDate(summary.surgery_date) : '-'}</span>
              </div>

              <div className="flex items-baseline">
                <span className="font-bold w-44 shrink-0">Date of Discharge :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(summary.discharge_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Content - Side by Side Layout */}
        <div className="space-y-6">
          {(summary.complaints || summary.presenting_complaint) && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Complaints / H/O :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.complaints || summary.presenting_complaint}</div>
              </div>
            </div>
          )}
          
          {summary.past_history && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Past History :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.past_history}</div>
              </div>
            </div>
          )}

          {(summary.on_examination || summary.physical_findings) && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">O/E (On Examination) :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.on_examination || summary.physical_findings}</div>
              </div>
            </div>
          )}

          {summary.systemic_examination && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">S/E (Systemic Examination) :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.systemic_examination}</div>
              </div>
            </div>
          )}

          {summary.investigations && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Investigations :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.investigations}</div>
              </div>
            </div>
          )}

          {(summary.diagnosis || summary.final_diagnosis) && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Diagnosis :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify font-semibold leading-relaxed">{summary.diagnosis || summary.final_diagnosis}</div>
              </div>
            </div>
          )}

          {summary.procedure_details && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Procedure Details :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.procedure_details}</div>
              </div>
            </div>
          )}

          {summary.treatment_given && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Treatment Given :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed border border-gray-200 p-4 rounded">
                  {summary.treatment_given}
                </div>
              </div>
            </div>
          )}

          {summary.course_in_hospital && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Course in Hospital :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.course_in_hospital}</div>
              </div>
            </div>
          )}

          {summary.surgery_notes && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Surgery Notes :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.surgery_notes}</div>
              </div>
            </div>
          )}

          {summary.discharge_advice && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Discharge Advice :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">{summary.discharge_advice}</div>
              </div>
            </div>
          )}

          {/* Clinical Vitals */}
          {(summary.bp || summary.pulse || summary.bs || summary.rr || summary.spo2 || summary.temp) && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Clinical Vitals at Discharge :</h3>
                <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                  {summary.bp && <div><span className="font-medium">BP:</span> {summary.bp} mmHg</div>}
                  {summary.pulse && <div><span className="font-medium">Pulse:</span> {summary.pulse} /min</div>}
                  {summary.bs && <div><span className="font-medium">BS:</span> {summary.bs} mg/dL</div>}
                  {summary.rr && <div><span className="font-medium">RR:</span> {summary.rr} /min</div>}
                  {summary.spo2 && <div><span className="font-medium">SPO2:</span> {summary.spo2}%</div>}
                  {summary.temp && <div><span className="font-medium">Temp:</span> {summary.temp}°F</div>}
                </div>
              </div>
            </div>
          )}

          {summary.condition_at_discharge && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Condition at Discharge :</h3>
                <div className="flex-1 py-2">
                  <p className="font-bold text-gray-900 border-b border-dotted border-gray-400 min-h-[1.5rem] pb-0.5">
                    {summary.condition_at_discharge || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Prescription Section */}
          {(summary.prescription || (summary.prescription_table && summary.prescription_table.length > 0)) && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Prescription :</h3>
                <div className="flex-1">
                  {/* Prescription Table */}
                  {summary.prescription_table && Array.isArray(summary.prescription_table) && summary.prescription_table.length > 0 ? (
                    <div className="mb-4">
                      {/* Added DRUG MEDICINE sub-heading as requested */}
                      <p className="font-bold text-sm text-gray-700 mb-2 uppercase tracking-wide underline underline-offset-4">DRUG MEDICINE</p>
                      <div className="border border-gray-300 rounded overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr className="border-b border-gray-300">
                              <th className="text-left p-2 font-bold text-gray-700">Medicine</th>
                              <th className="text-center p-2 font-bold text-gray-700">Dosage</th>
                              <th className="text-center p-2 font-bold text-gray-700">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.prescription_table.map((item: any, index: number) => (
                              <tr key={index} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="p-2 text-gray-800">{item.drug_details}</td>
                                <td className="text-center p-2 text-gray-800 font-medium">{item.per_day_time}</td>
                                <td className="text-center p-2 text-gray-800">{item.nos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Only show text field if table is empty */
                    summary.prescription && (
                      <div className="whitespace-pre-wrap text-justify leading-relaxed border border-gray-200 p-4 rounded bg-gray-50">
                        {summary.prescription}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {summary.follow_up_advice && (
            <div className="section-break">
              <div className="flex items-start gap-4">
                <h3 className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0 mt-1">Follow Up Advice :</h3>
                <div className="flex-1 whitespace-pre-wrap text-justify leading-relaxed">
                  {summary.follow_up_advice}
                </div>
              </div>
            </div>
          )}

          {summary.review_date && (
            <div className="section-break mt-8">
              <div className="flex items-center gap-4">
                <span className="font-bold uppercase text-sm text-blue-900 w-48 shrink-0">Review on :</span>
                <span className="border-b-2 border-dotted border-gray-400 min-w-[200px] inline-block text-center font-bold">
                  {formatDate(summary.review_date)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Signature Footer - Always keep together */}
        <div className="section-break mt-16">
          <div className="flex justify-end">
            <div className="text-center min-w-[250px]">
              <div className="h-16 flex items-end justify-center pb-2">
                {/* Digital Signature Placeholder */}
                {summary.status === 'final' && <span className="font-script text-xl italic text-blue-900">{summary.consult_doctor_name || summary.consultant_name}</span>}
              </div>
              <div className="border-t-2 border-gray-800 pt-2">
                <p className="font-bold text-sm uppercase">Signature of Doctor</p>
                {summary.finalized_at && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Finalized: {new Date(summary.finalized_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>,
      document.body
    );
  }
);

DischargePrintTemplate.displayName = 'DischargePrintTemplate';
