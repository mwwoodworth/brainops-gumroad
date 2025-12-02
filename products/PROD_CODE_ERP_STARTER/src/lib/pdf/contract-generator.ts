import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface ContractSection {
  heading: string;
  body: string;
}

export interface ContractPDFPayload {
  contractTitle: string;
  contractNumber: string;
  effectiveDate?: string;
  expirationDate?: string;
  totalFormatted: string;
  customer: {
    name?: string;
    company?: string;
    addressLines?: string[];
    phone?: string;
    email?: string;
  };
  projectAddress?: string;
  scopeOfWork?: string;
  paymentSchedule?: Array<{ label: string; value: string }>;
  sections?: ContractSection[];
  terms?: string[];
  company?: {
    name: string;
    tagline?: string;
    addressLines?: string[];
    phone?: string;
    email?: string;
    website?: string;
    license?: string;
  };
  signatures?: {
    customerLabel?: string;
    companyLabel?: string;
  };
}

function writeMultiline(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number
): number {
  const lines = pdf.splitTextToSize(text, width);
  pdf.text(lines, x, y);
  return y + lines.length * 5;
}

export function generateContractPDF(payload: ContractPDFPayload): Uint8Array {
  const pdf = new jsPDF();
  const {
    contractTitle,
    contractNumber,
    effectiveDate,
    expirationDate,
    totalFormatted,
    customer,
    projectAddress,
    scopeOfWork,
    paymentSchedule = [],
    sections = [],
    terms = [],
    signatures = {},
    company = {
      name: 'Weathercraft Roofing',
      addressLines: ['123 Main Street', 'Dallas, TX 75201'],
      phone: '(214) 555-0100',
      email: 'info@weathercraft.com',
      website: 'weathercraft.com',
      license: 'License #: RCL-12345',
    },
  } = payload;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(company.name, 20, 24);
  if (company.tagline) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(company.tagline, 20, 32);
  }

  pdf.setFontSize(9);
  (company.addressLines ?? []).forEach((line, idx) => pdf.text(line, 20, 40 + idx * 5));
  let companyInfoY = 40 + (company.addressLines?.length ?? 0) * 5;
  [company.phone, company.email, company.website, company.license]
    .filter(Boolean)
    .forEach((line) => {
      pdf.text(String(line), 20, companyInfoY);
      companyInfoY += 5;
    });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text('SERVICE CONTRACT', 120, 26);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Contract #: ${contractNumber}`, 120, 36);
  if (effectiveDate) {
    pdf.text(`Effective: ${effectiveDate}`, 120, 42);
  }
  if (expirationDate) {
    pdf.text(`Expires: ${expirationDate}`, 120, 48);
  }

  let cursorY = Math.max(companyInfoY + 10, 60);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Client Information', 20, cursorY);
  cursorY += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text(customer.name || 'Valued Customer', 20, cursorY);
  cursorY += 5;
  if (customer.company) {
    pdf.text(customer.company, 20, cursorY);
    cursorY += 5;
  }
  (customer.addressLines ?? []).forEach((line) => {
    pdf.text(line, 20, cursorY);
    cursorY += 5;
  });
  if (customer.phone) {
    pdf.text(`Phone: ${customer.phone}`, 20, cursorY);
    cursorY += 5;
  }
  if (customer.email) {
    pdf.text(`Email: ${customer.email}`, 20, cursorY);
    cursorY += 5;
  }

  if (projectAddress) {
    cursorY += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project Location', 20, cursorY);
    cursorY += 6;
    pdf.setFont('helvetica', 'normal');
    cursorY = writeMultiline(pdf, projectAddress, 20, cursorY, 80);
  }

  cursorY += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Scope of Work', 20, cursorY);
  cursorY += 6;
  pdf.setFont('helvetica', 'normal');
  cursorY = writeMultiline(
    pdf,
    scopeOfWork ??
      'Provide all labor, materials, equipment, and supervision to complete the roofing scope defined in the attached estimate, including cleanup and disposal.',
    20,
    cursorY,
    170
  );

  cursorY += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Investment Summary', 20, cursorY);
  cursorY += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Contract Value: ${totalFormatted}`, 20, cursorY);

  if (paymentSchedule.length) {
    cursorY += 6;
    pdf.text('Payment Schedule:', 20, cursorY);
    cursorY += 6;
    paymentSchedule.forEach((payment) => {
      pdf.text(`• ${payment.label}: ${payment.value}`, 20, cursorY);
      cursorY += 5;
    });
  }

  let sectionCursor = cursorY + 6;
  sections.forEach((section) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(section.heading, 20, sectionCursor);
    sectionCursor += 6;
    pdf.setFont('helvetica', 'normal');
    sectionCursor = writeMultiline(pdf, section.body, 20, sectionCursor, 170);
    sectionCursor += 6;
  });

  if (terms.length) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Terms & Conditions', 20, sectionCursor);
    sectionCursor += 6;
    pdf.setFont('helvetica', 'normal');
    terms.forEach((term, idx) => {
      sectionCursor = writeMultiline(pdf, `${idx + 1}. ${term}`, 20, sectionCursor, 170);
      sectionCursor += 2;
    });
  }

  const signatureY = Math.min(sectionCursor + 12, 270);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Acceptance & Signature', 20, signatureY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('By signing below, both parties agree to the terms outlined in this contract.', 20, signatureY + 6);

  const lineY = signatureY + 18;
  pdf.line(20, lineY, 100, lineY);
  pdf.text(signatures.customerLabel ?? 'Customer Signature / Date', 20, lineY + 5);

  pdf.line(120, lineY, 200, lineY);
  pdf.text(signatures.companyLabel ?? 'Weathercraft Authorized Signature / Date', 120, lineY + 5);

  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer);
}
