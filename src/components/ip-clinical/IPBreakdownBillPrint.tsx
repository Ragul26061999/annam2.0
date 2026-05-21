'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { IPComprehensiveBilling } from '../../lib/ipBillingService';

interface IPBreakdownBillPrintProps {
  billing: IPComprehensiveBilling;
  selectedDepartments?: string[];
  isLetterhead?: boolean;
  isSummarized?: boolean;
}

export function IPBreakdownBillPrint({ 
  billing, 
  selectedDepartments = [], 
  isLetterhead = false,
  isSummarized = false
}: IPBreakdownBillPrintProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '______________________';
    try {
      return new Date(dateString).toLocaleDateString('en-GB'); // DD/MM/YYYY format
    } catch (e) {
      return dateString;
    }
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

    if (num === 0) return 'ZERO RUPEES ONLY';

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = Math.floor(num % 1000);

    let result = '';
    if (crore > 0) result += convertLessThanThousand(crore) + ' CRORE ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' LAKH ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' THOUSAND ';
    if (remainder > 0) result += convertLessThanThousand(remainder);

    return result.trim() + ' RUPEES ONLY';
  };

  const getDepartmentBreakdown = () => {
    if (!billing) return [];

    const departments = [];

    // Group IP BILL items together as seen in Image 1
    const ipBillItems = [];
    let ipBillTotal = 0;

    // Doctor Fees
    if (billing.summary.doctor_consultation_total > 0) {
      ipBillItems.push({
        description: 'DOCTOR FEES',
        quantity: billing.doctor_consultation.days,
        unitPrice: billing.doctor_consultation.consultation_fee,
        total: billing.summary.doctor_consultation_total
      });
      ipBillTotal += billing.summary.doctor_consultation_total;
    }

    // Bed Charges
    if (billing.summary.bed_charges_total > 0) {
      ipBillItems.push({
        description: 'BED CHARGES',
        quantity: billing.bed_charges.days,
        unitPrice: billing.bed_charges.daily_rate,
        total: billing.summary.bed_charges_total
      });
      ipBillTotal += billing.summary.bed_charges_total;
    }

    // Nursing Charges & Other items that might be in doctor_services but belong to IP BILL
    if (billing.doctor_services && billing.doctor_services.length > 0) {
      billing.doctor_services.forEach(s => {
        const ipBillKeywords = ['NURSING', 'SUGAR', 'MONITORING', 'DRESSING', 'NEBULIZATION'];
        const isIPBillItem = ipBillKeywords.some(kw => s.service_type.toUpperCase().includes(kw));
        
        if (isIPBillItem) {
          ipBillItems.push({
            description: s.service_type.toUpperCase(),
            quantity: s.quantity,
            unitPrice: s.fee,
            total: s.total_amount
          });
          ipBillTotal += s.total_amount;
        }
      });
    }

    if (ipBillItems.length > 0) {
      departments.push({
        id: 'room_board',
        name: 'IP BILL',
        charges: ipBillTotal,
        items: ipBillItems
      });
    }

    // Clinical Chemistry & Haematology (Laboratory)
    if (billing.summary.lab_total > 0 && billing.lab_billing.length > 0) {
      const labItems: any[] = [];
      if (isSummarized) {
        const totalQty = billing.lab_billing.reduce((sum: number, order: any) => sum + (order.tests?.length || 0), 0);
        labItems.push({
          description: 'LABORATORY BILL',
          quantity: totalQty,
          unitPrice: 0,
          total: billing.summary.lab_total
        });
      } else {
        billing.lab_billing.forEach((order: any) => {
          (order.tests || []).forEach((test: any) => {
            labItems.push({
              description: test.test_name.toUpperCase(),
              quantity: 1,
              unitPrice: test.test_cost,
              total: test.test_cost
            });
          });
        });
      }

      departments.push({
        id: 'laboratory',
        name: 'Clinical Chemistry & Haematology',
        charges: billing.summary.lab_total,
        items: labItems
      });
    }

    // Pharmacy - SUMMARIZED
    if (billing.summary.pharmacy_total > 0 && billing.pharmacy_billing.length > 0) {
      const totalQty = billing.pharmacy_billing.reduce((sum: number, pb: any) => 
        sum + (pb.items || []).reduce((itemSum: number, item: any) => itemSum + item.quantity, 0)
      , 0);
      
      departments.push({
        id: 'pharmacy',
        name: 'Pharmacy',
        charges: billing.summary.pharmacy_total,
        items: [{
          description: 'PHARMACY BILL',
          quantity: totalQty,
          unitPrice: 0,
          total: billing.summary.pharmacy_total
        }]
      });
    }

    // Other Hospital Charges
    const miscItems: any[] = [];
    let miscTotal = 0;

    if (isSummarized) {
      let totalQty = 0;
      if (billing.doctor_services && billing.doctor_services.length > 0) {
        billing.doctor_services.forEach(s => {
          const ipBillKeywords = ['NURSING', 'SUGAR', 'MONITORING', 'DRESSING', 'NEBULIZATION'];
          const isIPBillItem = ipBillKeywords.some(kw => s.service_type.toUpperCase().includes(kw));
          if (!isIPBillItem) {
            miscTotal += s.total_amount;
            totalQty += s.quantity;
          }
        });
      }
      if (billing.summary.other_charges_total > 0) {
        (billing.other_charges || []).forEach((charge: any) => {
          miscTotal += charge.amount;
          totalQty += (charge.days || charge.quantity || 1);
        });
      }
      if (miscTotal > 0) {
        miscItems.push({
          description: 'OTHER HOSPITAL CHARGES',
          quantity: totalQty,
          unitPrice: 0,
          total: miscTotal
        });
      }
    } else {
      if (billing.doctor_services && billing.doctor_services.length > 0) {
        billing.doctor_services.forEach(s => {
          const ipBillKeywords = ['NURSING', 'SUGAR', 'MONITORING', 'DRESSING', 'NEBULIZATION'];
          const isIPBillItem = ipBillKeywords.some(kw => s.service_type.toUpperCase().includes(kw));
          
          if (!isIPBillItem) {
            miscItems.push({
              description: s.service_type.toUpperCase(),
              quantity: s.quantity,
              unitPrice: s.fee,
              total: s.total_amount
            });
            miscTotal += s.total_amount;
          }
        });
      }

      if (billing.summary.other_charges_total > 0) {
        (billing.other_charges || []).forEach((charge: any) => {
          miscItems.push({
            description: charge.service_name.toUpperCase(),
            quantity: charge.days || charge.quantity || 1,
            unitPrice: charge.rate,
            total: charge.amount
          });
          miscTotal += charge.amount;
        });
      }
    }

    if (miscItems.length > 0) {
      departments.push({
        id: 'other_bills',
        name: 'Other Hospital Charges',
        charges: miscTotal,
        items: miscItems
      });
    }
    
    // Radiology - SUMMARIZED (Keeping this summarized unless user asks otherwise)
    if (billing.summary.radiology_total > 0 && billing.radiology_billing.length > 0) {
      const totalQty = billing.radiology_billing.reduce((sum: number, rb: any) => sum + (rb.scans?.length || 0), 0);
      
      departments.push({
        id: 'radiology',
        name: 'Radiology & Imaging',
        charges: billing.summary.radiology_total,
        items: [{
          description: 'RADIOLOGY BILL',
          quantity: totalQty,
          unitPrice: 0,
          total: billing.summary.radiology_total
        }]
      });
    }

    return departments;
  };

  const allDepartments = getDepartmentBreakdown();
  const departments = allDepartments.filter(d => 
    selectedDepartments.length === 0 || selectedDepartments.includes(d.id)
  );

  const totalSelectedCharges = departments.reduce((sum, d) => sum + d.charges, 0);

  const printContent = (
    <div className="bg-white text-black print-template hidden print:block print-portal-root">
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
            height: auto;
            overflow: visible;
          }
          
          body > * {
            display: none !important;
          }

          body > .print-portal-root {
            display: block !important;
            position: relative;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: black;
            background: white;
            z-index: 9999;
            visibility: visible;
          }

          @page {
            size: A4;
            margin: ${isLetterhead ? '6cm 1.5cm 2cm 1.5cm' : '15mm'};
          }

          .letterhead-padding {
            padding: 0;
          }

          .standard-padding {
            padding: 5mm;
          }

          .print-portal-root table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
          }

          .print-portal-root th {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 8px 4px;
            text-align: left;
            font-size: 9pt;
            font-weight: bold;
          }

          .print-portal-root td {
            padding: 6px 4px;
            text-align: left;
            font-size: 9pt;
          }

          .print-portal-root .text-center { text-align: center; }
          .print-portal-root .text-right { text-align: right; }
          .print-portal-root .font-bold { font-weight: bold; }
          
          .department-section {
            margin-bottom: 5px;
          }

          .department-header {
            font-weight: bold;
            font-size: 10pt;
            margin-top: 5px;
            margin-bottom: 2px;
            text-decoration: underline;
          }

          .department-total {
            text-align: right;
            font-weight: bold;
            padding: 4px;
            border-top: 1px solid #000;
            width: 150px;
            margin-left: auto;
          }

          .summary-box {
            margin-top: 15px;
            border-top: 1px solid #000;
            padding-top: 8px;
          }

          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }

          .signature-box {
            width: 200px;
            text-align: center;
            padding-top: 40px;
            font-weight: bold;
            font-size: 9pt;
          }

          .stamp-container {
            display: flex;
            justify-content: center;
            margin-top: 20px;
          }

          .paid-stamp {
            border: 4px solid #000;
            padding: 10px 40px;
            font-size: 20pt;
            font-weight: 900;
            transform: rotate(-10deg);
            opacity: 0.8;
          }
        }
      `}</style>

      <div className={isLetterhead ? 'letterhead-padding' : 'standard-padding'}>
        {!isLetterhead && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ height: '96px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <img 
                  src="/images/logo.png" 
                  alt="Annam Hospital Logo" 
                  style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
                />
              </div>
              
              <div style={{ textAlign: 'center', fontSize: '10pt', lineHeight: '1.2', color: 'black' }}>
                <p style={{ margin: '2px 0' }}>2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk,</p>
                <p style={{ margin: '2px 0' }}>Thoothukudi - 628 216. <span style={{ fontWeight: 'bold' }}>Cell : 86818 50592, 86819 50592</span></p>
                <p style={{ margin: '2px 0', fontSize: '9pt' }}>Email: annammultispecialityhospital@gmail.com</p>
              </div>
            </div>
          </div>
        )}

        {/* Standardized Header Style from IPBillingView */}
        <div className="text-center mb-6 mt-2">
          <h3 className="text-[16pt] font-black text-[#2980b9] uppercase tracking-[0.2em] border-y-2 border-[#2980b9] inline-block px-12 py-1">
            {isSummarized ? 'Final Billing Statement' : 'Inpatient Billing'}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-[9pt]">
          {/* Left Column - Patient Information */}
          <div className="border border-black p-3 space-y-1">
            <h3 className="font-bold uppercase text-[10pt] mb-2 underline">Patient Information</h3>
            <div className="flex"><span className="font-bold w-24">IP No</span><span>: {billing.admission.ip_number}</span></div>
            <div className="flex"><span className="font-bold w-24">UH ID</span><span>: {billing.patient.patient_id}</span></div>
            <div className="flex"><span className="font-bold w-24">Patient Name</span><span className="uppercase">: {billing.patient.name}</span></div>
            <div className="flex"><span className="font-bold w-24">Age / Gender</span><span>: {billing.patient.age} / {billing.patient.gender}</span></div>
          </div>

          {/* Right Column - Bill Details */}
          <div className="border border-black p-3 space-y-1">
            <h3 className="font-bold uppercase text-[10pt] mb-2 underline">Bill Details</h3>
            <div className="flex"><span className="font-bold w-28">Bill Date</span><span>: {formatDate(new Date().toISOString())}</span></div>
            <div className="flex"><span className="font-bold w-28">Doctor Name</span><span className="uppercase">: DR.{billing.doctor_consultation.doctor_name || 'N/A'}</span></div>
            <div className="flex"><span className="font-bold w-28">Payment Status</span><span className="uppercase">: {billing.status.toUpperCase()}</span></div>
            <div className="flex"><span className="font-bold w-28">Room/Bed</span><span className="uppercase">: {billing.admission.room_number} / {billing.admission.bed_number}</span></div>
          </div>
        </div>

        {/* Department Breakdowns */}
        {departments.map((dept) => (
          <div key={dept.id} className="department-section">
            <div className="department-header">{dept.name}</div>
            <table>
              <thead>
                <tr>
                  <th style={{width: '10%'}}>SERVICE</th>
                  <th style={{width: '50%'}}></th>
                  <th style={{width: '15%'}} className="text-right">RATE</th>
                  <th style={{width: '10%'}} className="text-center">QTY</th>
                  <th style={{width: '15%'}} className="text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {dept.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td colSpan={2} className="uppercase">{item.description}</td>
                    <td className="text-right">
                      {item.unitPrice > 0 ? item.unitPrice.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}
                    </td>
                    <td className="text-center">{item.quantity > 0 ? item.quantity : ''}</td>
                    <td className="text-right font-bold">{item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="department-total">
              {dept.charges.toLocaleString('en-IN', {minimumFractionDigits: 2})}
            </div>
          </div>
        ))}

        {/* Final Summary Box */}
        <div className="mt-6 border-t border-black pt-4">
          <div className="flex justify-between items-center font-bold text-[10pt]">
            <div className="flex-1">
              <span>Total Bill Amount : </span>
              <span className="ml-4">{formatCurrency(totalSelectedCharges).replace('₹', '')}/-</span>
            </div>
            <div className="text-right w-48 border-t-2 border-black pt-2">
              {totalSelectedCharges.toLocaleString('en-IN', {minimumFractionDigits: 2})}/-
            </div>
          </div>
          
          <div className="mt-4 uppercase text-[9pt] font-black italic">
            Total Amount {numberToWords(Math.round(totalSelectedCharges))}
          </div>
        </div>
  
        {/* Payment Status Stamp */}
        <div className="stamp-container">
          <div className="paid-stamp">
            {billing.status === 'paid' ? 'CASH PAID' : 
             billing.status === 'partial' ? 'PARTIAL PAID' : 'PENDING'}
          </div>
        </div>

        {/* Signatures */}
        <div className="signature-section">
          <div className="signature-box flex flex-col items-center">
             <div className="mb-4">
                <img src="/images/signature.png" alt="" className="h-12 w-auto opacity-0" />
             </div>
             <div className="border-t border-black w-full">Authorized Signatory</div>
          </div>
          <div className="signature-box flex flex-col items-center">
             <div className="mb-4 h-12"></div>
             <div className="border-t border-black w-full">Patient / Attender</div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(printContent, document.body);
}
