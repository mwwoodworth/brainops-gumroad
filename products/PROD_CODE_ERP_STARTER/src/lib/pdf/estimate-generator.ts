import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface EstimateData {
  estimate: any;
  customer: any;
  items: any[];
  company?: any;
}

export function generateEstimatePDF(data: EstimateData): Uint8Array {
  const pdf = new jsPDF();
  const { estimate, customer, items, company } = data;

  // Company Header with Logo space
  const companyName =
    company?.legal_name ||
    company?.company_name ||
    company?.name ||
    'Weathercraft Roofing Co.';
  const companyAddressLine1 =
    company?.address_line1 ||
    company?.address ||
    '123 Main Street';
  const companyAddressLine2 =
    company?.address_line2 ||
    (company?.city && company?.state && company?.zip
      ? `${company.city}, ${company.state} ${company.zip}`
      : 'Dallas, TX 75201');
  const companyPhone =
    company?.phone ||
    company?.support_phone ||
    '(214) 555-0100';
  const companyEmail =
    company?.billing_email ||
    company?.support_email ||
    company?.email ||
    'info@weathercraft.com';
  const licenseNumber =
    company?.license_number ||
    company?.contractor_license ||
    'RCL-12345';

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyName, 20, 20);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(companyAddressLine1, 20, 28);
  pdf.text(companyAddressLine2, 20, 33);
  pdf.text(`Phone: ${companyPhone}`, 20, 38);
  pdf.text(`Email: ${companyEmail}`, 20, 43);
  pdf.text(`License #: ${licenseNumber}`, 20, 48);
  pdf.text('BBB Accredited | Fully Insured', 20, 53);

  // Estimate Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ESTIMATE', 140, 20);

  // Estimate Details Box
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.rect(135, 25, 60, 35);
  pdf.text(`Estimate #: ${estimate.estimate_number || 'EST-0000'}`, 140, 32);
  pdf.text(`Date: ${new Date(estimate.created_at).toLocaleDateString()}`, 140, 38);
  pdf.text(`Valid Until: ${new Date(estimate.valid_until || Date.now() + 30*24*60*60*1000).toLocaleDateString()}`, 140, 44);
  pdf.text(`Status: ${estimate.status?.toUpperCase()}`, 140, 50);
  pdf.text(`Prepared By: ${estimate.prepared_by || 'Sales Team'}`, 140, 56);

  // Customer Section
  pdf.setFont('helvetica', 'bold');
  pdf.text('PREPARED FOR:', 20, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.text(customer?.name || 'Customer Name', 20, 75);
  pdf.text(customer?.address || 'Customer Address', 20, 80);
  pdf.text(`${customer?.city || 'City'}, ${customer?.state || 'ST'} ${customer?.zip || '00000'}`, 20, 85);
  pdf.text(`Phone: ${customer?.phone || '(000) 000-0000'}`, 20, 90);
  pdf.text(`Email: ${customer?.email || 'email@example.com'}`, 20, 95);

  // Property Details
  if (estimate.property_address) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROPERTY DETAILS:', 20, 108);
    pdf.setFont('helvetica', 'normal');
    pdf.text(estimate.property_address, 20, 115);
    if (estimate.square_footage) {
      pdf.text(`Square Footage: ${estimate.square_footage} sq ft`, 20, 120);
    }
    if (estimate.pitch) {
      pdf.text(`Roof Pitch: ${estimate.pitch}`, 20, 125);
    }
  }

  // Scope of Work
  const scopeY = estimate.property_address ? 135 : 110;
  pdf.setFont('helvetica', 'bold');
  pdf.text('SCOPE OF WORK:', 20, scopeY);
  pdf.setFont('helvetica', 'normal');

  const scopeText = estimate.scope_of_work ||
    'Complete roof replacement including removal of existing roofing materials, ' +
    'installation of new underlayment, and installation of architectural shingles. ' +
    'Includes all labor, materials, and cleanup.';

  const scopeLines = pdf.splitTextToSize(scopeText, 170);
  pdf.text(scopeLines, 20, scopeY + 7);

  // Items Table
  const tableStartY = scopeY + 7 + (scopeLines.length * 5) + 10;

  const tableColumns = ['Item', 'Description', 'Qty', 'Unit', 'Rate', 'Amount'];
  const tableRows = items.map(item => [
    item.name || item.item_name || 'Service',
    item.description || '',
    (item.quantity || 1).toString(),
    item.unit || 'EA',
    `$${(item.unit_price || item.rate || 0).toFixed(2)}`,
    `$${(item.total || item.amount || 0).toFixed(2)}`
  ]);

  pdf.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: tableStartY,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 122, 183],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 65 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' }
    }
  });

  // Calculate totals position
  const finalY = (pdf as any).lastAutoTable.finalY + 10;

  // Totals Section
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', 135, finalY);
  pdf.text(`$${(estimate.subtotal || 0).toFixed(2)}`, 175, finalY, { align: 'right' });

  if (estimate.tax_amount > 0) {
    pdf.text(`Tax (${estimate.tax_rate || 0}%):`, 135, finalY + 6);
    pdf.text(`$${(estimate.tax_amount || 0).toFixed(2)}`, 175, finalY + 6, { align: 'right' });
  }

  if (estimate.discount_amount > 0) {
    pdf.text('Discount:', 135, finalY + 12);
    pdf.text(`-$${(estimate.discount_amount || 0).toFixed(2)}`, 175, finalY + 12, { align: 'right' });
  }

  // Total Amount
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const totalY = estimate.tax_amount > 0 ? finalY + 20 : finalY + 10;
  pdf.text('TOTAL:', 135, totalY);
  pdf.text(`$${(estimate.total_amount || 0).toFixed(2)}`, 175, totalY, { align: 'right' });

  // Terms & Conditions
  const termsY = totalY + 20;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TERMS & CONDITIONS:', 20, termsY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);

  const terms = [
    '1. This estimate is valid for 30 days from the date above.',
    '2. 50% deposit required to schedule work.',
    '3. Balance due upon completion.',
    '4. Warranty: 10-year workmanship, manufacturer warranty on materials.',
    '5. Any changes to scope will require written approval.',
    '6. Price includes all permits, labor, materials, and cleanup.'
  ];

  terms.forEach((term, index) => {
    pdf.text(term, 20, termsY + 7 + (index * 4));
  });

  // Acceptance Section
  const acceptY = termsY + 35;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACCEPTANCE:', 20, acceptY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('I approve the work as specified above and authorize Weathercraft Roofing to proceed.', 20, acceptY + 7);

  // Signature lines / image
  const signatureLineY = acceptY + 20;
  pdf.line(20, signatureLineY, 90, signatureLineY);
  pdf.text('Customer Signature', 20, signatureLineY + 5);
  pdf.text('Date: _____________', 100, signatureLineY + 5);

  // If a captured signature is available, render it above the line
  if (typeof estimate.signature_data === 'string' && estimate.signature_data.startsWith('data:image')) {
    try {
      // Place the signature image slightly above the signature line
      pdf.addImage(
        estimate.signature_data,
        'PNG',
        20,
        signatureLineY - 18,
        70,
        18
      );
    } catch {
      // If the image fails to render, fall back to the line-only UI
    }
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(128);
  pdf.text('Thank you for considering Weathercraft Roofing!', 105, 280, { align: 'center' });
  pdf.text(
    `Questions? Contact us at ${companyPhone} or ${companyEmail}`,
    105,
    285,
    { align: 'center' }
  );

  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer);
}
