import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface PreJobPacketInputs {
  job: any;
  customer?: any;
  schedule?: {
    start?: string | null;
    end?: string | null;
  };
  crewNotes?: string;
  scheduleNotes?: string;
  safetyNotes?: string[];
  materials?: Array<{ name: string; quantity?: string }>;
  submittals?: Array<{
    title: string;
    submittal_type: string;
    status: string;
    due_date?: string | null;
    revision?: number;
  }>;
}

export function generatePreJobPacketPDF(data: PreJobPacketInputs): Uint8Array {
  const pdf = new jsPDF();

  const job = data.job ?? {};
  const customer = data.customer ?? {};

  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Pre-Job Packet', 20, 20);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Weathercraft Roofing Co.', 20, 28);
  pdf.text('Operational Excellence Team', 20, 33);
  pdf.text(new Date().toLocaleString(), 20, 38);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Overview', 20, 50);
  pdf.setFont('helvetica', 'normal');
  const overview = [
    `Job #: ${job.job_number || job.id}`,
    `Title: ${job.title || 'Roofing Project'}`,
    `Status: ${(job.status || 'scheduled').toString().replace(/_/g, ' ')}`,
    `Customer: ${customer.name || 'Not assigned'}`,
    customer.phone ? `Customer Phone: ${customer.phone}` : null,
    customer.email ? `Customer Email: ${customer.email}` : null,
    job.job_address ? `Site Address: ${job.job_address}` : null,
  ].filter(Boolean) as string[];

  pdf.text(overview, 20, 56);

  const scheduleY = 56 + overview.length * 5 + 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Schedule', 20, scheduleY);
  pdf.setFont('helvetica', 'normal');
  const startDate = data.schedule?.start ? new Date(data.schedule.start).toLocaleString() : 'Not scheduled';
  const endDate = data.schedule?.end ? new Date(data.schedule.end).toLocaleString() : 'Not scheduled';
  pdf.text(`Start: ${startDate}`, 20, scheduleY + 7);
  pdf.text(`Target Completion: ${endDate}`, 20, scheduleY + 12);

  let contentY = scheduleY + 22;

  if (data.scheduleNotes) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Schedule Notes', 20, contentY);
    pdf.setFont('helvetica', 'normal');
    const scheduleLines = pdf.splitTextToSize(data.scheduleNotes, 170);
    pdf.text(scheduleLines, 20, contentY + 7);
    contentY += scheduleLines.length * 5 + 14;
  }

  if (data.crewNotes) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Crew Briefing', 20, contentY);
    pdf.setFont('helvetica', 'normal');
    const crewLines = pdf.splitTextToSize(data.crewNotes, 170);
    pdf.text(crewLines, 20, contentY + 7);
    contentY += crewLines.length * 5 + 14;
  }

  const materials = data.materials ?? [];
  if (materials.length) {
    const lastAutoTable = (pdf as any).lastAutoTable;
    const tableStart = lastAutoTable ? lastAutoTable.finalY + 15 : contentY;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Material Takeoff', 20, tableStart);
    (pdf as any).lastAutoTable = null;
    pdf.autoTable({
      head: [['Material', 'Quantity']],
      body: materials.map(item => [item.name, item.quantity || '—']),
      startY: tableStart + 4,
      theme: 'striped',
      headStyles: { fillColor: [33, 150, 243], textColor: 255 },
    });
    contentY = ((pdf as any).lastAutoTable?.finalY ?? tableStart) + 12;
  }

  const safety = data.safetyNotes ?? [];
  let currentY = (pdf as any).lastAutoTable?.finalY
    ? (pdf as any).lastAutoTable.finalY + 10
    : Math.max(contentY, scheduleY + 22);
  if (safety.length) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Safety Checklist', 20, currentY);
    pdf.setFont('helvetica', 'normal');
    safety.forEach((note, idx) => {
      pdf.text(`${idx + 1}. ${note}`, 20, currentY + 6 + idx * 5);
    });
    currentY += 6 + safety.length * 5 + 8;
  }

  const submittals = data.submittals ?? [];
  if (submittals.length) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Submittal Register', 20, currentY);
    const rows = submittals.map(item => [
      item.title,
      item.submittal_type,
      item.status.replace(/_/g, ' ').toUpperCase(),
      item.revision?.toString() ?? '0',
      item.due_date ? new Date(item.due_date).toLocaleDateString() : '—',
    ]);

    pdf.autoTable({
      head: [['Title', 'Type', 'Status', 'Rev', 'Due Date']],
      body: rows,
      startY: currentY + 4,
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80], textColor: 255 },
    });
    currentY = (pdf as any).lastAutoTable.finalY + 12;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.text('Sign-off', 20, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Superintendent Signature: ____________________________', 20, currentY + 12);
  pdf.text('Date: ____________________', 20, currentY + 22);

  const pdfArrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
  return new Uint8Array(pdfArrayBuffer);
}
