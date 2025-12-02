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

export interface ProposalPDFSection {
  heading: string;
  body: string;
}

export interface ProposalPDFPayload {
  proposalTitle: string;
  estimateNumber?: string;
  customer: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    addressLines?: string[];
  };
  projectAddress?: string;
  sections: ProposalPDFSection[];
  pricingRows: Array<{ label: string; value: string }>;
  totalFormatted: string;
  subtotalFormatted?: string;
  taxFormatted?: string | null;
  discountFormatted?: string | null;
  validUntil?: string;
  highlights?: string[];
  company?: {
    name: string;
    tagline?: string;
    addressLines?: string[];
    phone?: string;
    email?: string;
    website?: string;
    license?: string;
  };
}

function writeWrappedText(
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

export function generateProposalPDF(payload: ProposalPDFPayload): Uint8Array {
  const pdf = new jsPDF();
  const {
    proposalTitle,
    estimateNumber,
    customer,
    projectAddress,
    sections,
    pricingRows,
    totalFormatted,
    subtotalFormatted,
    taxFormatted,
    discountFormatted,
    validUntil,
    highlights,
    company = {
      name: 'Weathercraft Roofing',
      tagline: 'Premier Roofing & Exterior Specialists',
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
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(company.tagline, 20, 32);
  }

  pdf.setFontSize(9);
  if (company.addressLines) {
    company.addressLines.forEach((line, idx) => {
      pdf.text(line, 20, 40 + idx * 5);
    });
  }

  let contactY = 40 + (company.addressLines?.length ?? 0) * 5;
  const contactLines = [company.phone, company.email, company.website, company.license].filter(
    Boolean
  ) as string[];
  contactLines.forEach((line) => {
    pdf.text(line, 20, contactY);
    contactY += 5;
  });

  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROJECT PROPOSAL', 130, 26);

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Title: ${proposalTitle}`, 130, 36);
  if (estimateNumber) {
    pdf.text(`Estimate #: ${estimateNumber}`, 130, 42);
  }
  if (validUntil) {
    pdf.text(`Valid Until: ${validUntil}`, 130, 48);
  }

  let cursorY = Math.max(contactY + 10, 60);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Prepared For', 20, cursorY);
  pdf.setFont('helvetica', 'normal');
  cursorY += 6;
  pdf.text(customer.name || 'Valued Customer', 20, cursorY);
  cursorY += 5;
  if (customer.company) {
    pdf.text(customer.company, 20, cursorY);
    cursorY += 5;
  }
  if (customer.addressLines && customer.addressLines.length > 0) {
    customer.addressLines.forEach((line) => {
      pdf.text(line, 20, cursorY);
      cursorY += 5;
    });
  }
  if (customer.phone) {
    pdf.text(`Phone: ${customer.phone}`, 20, cursorY);
    cursorY += 5;
  }
  if (customer.email) {
    pdf.text(`Email: ${customer.email}`, 20, cursorY);
    cursorY += 5;
  }

  if (projectAddress) {
    cursorY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project Location', 20, cursorY);
    pdf.setFont('helvetica', 'normal');
    cursorY += 6;
    cursorY = writeWrappedText(pdf, projectAddress, 20, cursorY, 80);
  }

  const summaryStartY = cursorY + 6;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Investment Summary', 20, summaryStartY);
  pdf.setFont('helvetica', 'normal');
  const pricingTableStart = summaryStartY + 6;

  pdf.autoTable({
    head: [['Category', 'Amount']],
    body: pricingRows.map((row) => [row.label, row.value]),
    startY: pricingTableStart,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'right' },
    },
  });

  let totalsY = (pdf.lastAutoTable?.finalY ?? pricingTableStart) + 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Total Investment: ${totalFormatted}`, 22, totalsY);
  pdf.setFont('helvetica', 'normal');
  totalsY += 5;
  if (subtotalFormatted) {
    pdf.text(`Subtotal: ${subtotalFormatted}`, 22, totalsY);
    totalsY += 5;
  }
  if (taxFormatted) {
    pdf.text(`Tax: ${taxFormatted}`, 22, totalsY);
    totalsY += 5;
  }
  if (discountFormatted) {
    pdf.text(`Discounts: ${discountFormatted}`, 22, totalsY);
    totalsY += 5;
  }

  if (highlights && highlights.length > 0) {
    totalsY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Highlights & Deliverables', 20, totalsY);
    pdf.setFont('helvetica', 'normal');
    totalsY += 6;
    highlights.forEach((highlight) => {
      pdf.circle(20, totalsY - 2, 1, 'F');
      pdf.text(highlight, 24, totalsY);
      totalsY += 5;
    });
  }

  let sectionY = Math.max(totalsY + 8, 140);
  sections.forEach((section) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(section.heading, 20, sectionY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    sectionY = writeWrappedText(pdf, section.body, 20, sectionY + 7, 170) + 6;
  });

  const footerY = Math.min(sectionY + 10, 270);
  pdf.setFontSize(9);
  pdf.setTextColor(130);
  pdf.text(
    'Please review the proposal carefully. Approvals can be completed electronically or by contacting your project consultant.',
    20,
    footerY
  );
  pdf.text('We appreciate the opportunity to earn your business.', 20, footerY + 5);

  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer);
}
