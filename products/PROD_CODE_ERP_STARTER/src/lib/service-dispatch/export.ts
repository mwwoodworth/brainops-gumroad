import type { ServiceTicket } from '@/app/(app)/service-dispatch/service-dispatch-data-hooks';

const CSV_HEADERS = [
  'Ticket Number',
  'Stage',
  'Status',
  'Priority',
  'Dispatch Type',
  'Customer',
  'Property Address',
  'Scheduled Date',
  'Assigned Crew',
  'Invoiced Amount',
  'Collections Stage'
] as const;

const sanitize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return '';
  }

  return String(value).trim();
};

const toCsvCell = (value: string): string => {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const buildServiceTicketCsv = (tickets: ServiceTicket[]): string => {
  const rows = tickets.map((ticket) => {
    const propertyAddress = [
      ticket.property?.address,
      ticket.property?.city,
      ticket.property?.state,
      ticket.property?.zip
    ]
      .filter(Boolean)
      .join(', ');

    const row = [
      sanitize(ticket.ticket_number),
      sanitize(ticket.stage),
      sanitize(ticket.status),
      sanitize(ticket.priority),
      sanitize(ticket.dispatch_type),
      sanitize(ticket.customer_name),
      sanitize(propertyAddress),
      sanitize(ticket.scheduled_date ?? ticket.entry_date),
      sanitize(ticket.assigned_crew?.name),
      sanitize(ticket.invoiced_amount ?? ticket.quoted_amount ?? ''),
      sanitize(ticket.collections_stage),
    ];

    return row.map(toCsvCell).join(',');
  });

  return [CSV_HEADERS.map(toCsvCell).join(','), ...rows].join('\n');
};
