import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface InvoiceData {
  invoice: any;
  customer: any;
  items: any[];
  company?: any;
}

export function generateInvoicePDF(data: InvoiceData): Buffer {
  const pdf = new jsPDF();
  const { invoice, customer, items, company } = data;

  // Company Header
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

  // Invoice Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', 140, 20);

  // Invoice Details Box
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.rect(135, 25, 60, 30);
  pdf.text(`Invoice #: ${invoice.invoice_number || 'INV-0000'}`, 140, 32);
  pdf.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 140, 38);
  pdf.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 140, 44);
  pdf.text(`Status: ${invoice.status?.toUpperCase()}`, 140, 50);

  // Bill To Section
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILL TO:', 20, 65);
  pdf.setFont('helvetica', 'normal');
  pdf.text(customer?.name || 'Customer Name', 20, 72);
  pdf.text(customer?.address || 'Customer Address', 20, 77);
  pdf.text(`${customer?.city || 'City'}, ${customer?.state || 'ST'} ${customer?.zip || '00000'}`, 20, 82);
  pdf.text(`Phone: ${customer?.phone || '(000) 000-0000'}`, 20, 87);
  pdf.text(`Email: ${customer?.email || 'email@example.com'}`, 20, 92);

  // Job/Project Details
  if (invoice.job_id || invoice.project_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROJECT DETAILS:', 20, 105);
    pdf.setFont('helvetica', 'normal');
    if (invoice.project_name) {
      pdf.text(`Project: ${invoice.project_name}`, 20, 112);
    }
    if (invoice.property_address) {
      pdf.text(`Property: ${invoice.property_address}`, 20, 117);
    }
  }

  // Items Table
  const tableStartY = invoice.project_name ? 130 : 110;

  const tableColumns = ['Item', 'Description', 'Qty', 'Rate', 'Amount'];
  const tableRows = items.map(item => [
    item.name || item.item_name || 'Service',
    item.description || '',
    (item.quantity || 1).toString(),
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
      1: { cellWidth: 80 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });

  // Calculate totals position
  const finalY = (pdf as any).lastAutoTable.finalY + 10;

  // Totals Section
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', 135, finalY);
  pdf.text(`$${(invoice.subtotal || 0).toFixed(2)}`, 175, finalY, { align: 'right' });

  if (invoice.tax_amount > 0) {
    pdf.text(`Tax (${invoice.tax_rate || 0}%):`, 135, finalY + 6);
    pdf.text(`$${(invoice.tax_amount || 0).toFixed(2)}`, 175, finalY + 6, { align: 'right' });
  }

  if (invoice.discount_amount > 0) {
    pdf.text('Discount:', 135, finalY + 12);
    pdf.text(`-$${(invoice.discount_amount || 0).toFixed(2)}`, 175, finalY + 12, { align: 'right' });
  }

  // Total Amount
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const totalY = invoice.tax_amount > 0 ? finalY + 20 : finalY + 10;
  pdf.text('Total Due:', 135, totalY);
  pdf.text(`$${(invoice.total_amount || 0).toFixed(2)}`, 175, totalY, { align: 'right' });

  // Payment Terms
  const termsY = totalY + 20;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PAYMENT TERMS:', 20, termsY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(invoice.payment_terms || 'Net 30 - Payment due within 30 days', 20, termsY + 6);

  // Notes
  if (invoice.notes) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTES:', 20, termsY + 18);
    pdf.setFont('helvetica', 'normal');
    const notes = pdf.splitTextToSize(invoice.notes, 170);
    pdf.text(notes, 20, termsY + 24);
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(128);
  pdf.text('Thank you for your business!', 105, 280, { align: 'center' });
  pdf.text(
    `Questions? Contact us at ${companyPhone} or ${companyEmail}`,
    105,
    285,
    { align: 'center' }
  );

  // Return as Buffer for Next.js API route
  const arrayBuffer = pdf.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
